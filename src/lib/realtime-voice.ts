"use client";

// 極簡的 OpenAI Realtime WebRTC 封裝：語音直接進、語音直接出，全程雙向串流，
// 不需要自己做「錄音→辨識→組句→合成」三段式等待——這正是 ChatGPT 語音模式、
// Gemini Live 之所以流暢自然的架構本身，不是換個更快的模型就能模仿出來的。
//
// 事件名稱依 OpenAI Realtime API 目前的事件結構撰寫；這支 API 迭代較快，
// 若日後事件名稱有變動，未知的事件型別會被安靜忽略（見 handleEvent 的
// default 分支），不會讓連線整個爆掉，但對應的回呼也就不會被觸發——除錯時
// 第一步是打開瀏覽器 devtools 看 dc.onmessage 印出的原始事件。

export interface RealtimeHandlers {
  onRemoteTrack?: (stream: MediaStream) => void;
  onUserSpeechStart?: () => void;
  onUserSpeechStop?: () => void;
  onUserTranscript?: (text: string) => void; // 老闆說的完整一句
  onAssistantTranscriptDelta?: (delta: string) => void; // Agent 回覆逐字（即時字幕用）
  onAssistantTranscriptDone?: (text: string) => void; // Agent 這輪完整回覆
  onAssistantSpeechStart?: () => void;
  onAssistantSpeechStop?: () => void;
  /** Agent 呼叫了工具（換人／把結果推上畫面）。argsJson 是未解析的 JSON 字串。 */
  onFunctionCall?: (name: string, argsJson: string, callId: string) => void;
  /** 這一輪回覆結束後，OpenAI 回報的實際 token 用量（成本記錄用）。 */
  onUsage?: (usage: RealtimeUsage) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface RealtimeUsage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_token_details?: {
    text_tokens?: number;
    audio_tokens?: number;
    cached_tokens?: number;
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number };
  };
  output_token_details?: { text_tokens?: number; audio_tokens?: number };
}

export class RealtimeVoiceSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private handlers: RealtimeHandlers;
  private closed = false;
  private dcOpen: Promise<void> = Promise.resolve();

  constructor(handlers: RealtimeHandlers) {
    this.handlers = handlers;
  }

  get connection(): RTCPeerConnection | null {
    return this.pc;
  }

  /**
   * 建立 WebRTC 連線：把麥克風軌道送進去、把回傳的語音軌道接出來。
   * model 參數已內含在換發 token 當下設定好的 session 裡，這裡不需要再指定；
   * SDP 交握固定打 /v1/realtime/calls。
   *
   * 帶上公用 STUN server：之前完全沒設定 iceServers（OpenAI 官方範例也是這樣），
   * 在對外走 NAT 的網路（校園網路、公司網路、部分家用路由器）下，瀏覽器沒辦法
   * 探測到自己對外可見的位址，語音就可能斷斷續續甚至連不上——這正是「語音不太
   * 順利、不確定是不是網路問題」最常見的成因之一。STUN 只是幫忙探測位址，不會
   * 經手任何語音內容，也不需要密鑰。
   */
  async connect(token: string, micTrack: MediaStreamTrack): Promise<void> {
    this.closed = false;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
    });
    this.pc = pc;

    pc.ontrack = (e) => {
      if (e.streams[0]) this.handlers.onRemoteTrack?.(e.streams[0]);
    };
    pc.addTrack(micTrack);

    const dc = pc.createDataChannel("oai-events");
    this.dc = dc;
    this.dcOpen = new Promise((resolve) => {
      if (dc.readyState === "open") resolve();
      else dc.addEventListener("open", () => resolve(), { once: true });
    });
    dc.onmessage = (e) => this.handleEvent(e.data);
    dc.onerror = () => this.handlers.onError?.("即時語音資料通道發生錯誤");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const res = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
      body: offer.sdp,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`即時語音連線失敗 (${res.status}): ${text}`);
    }
    const answerSdp = await res.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    // 資料通道通常在這之後很快打開；設 3 秒逾時保底，避免卡在等待
    await Promise.race([this.dcOpen, new Promise<void>((r) => setTimeout(r, 3000))]);
  }

  /** 把一段文字塞進對話（例如手動打字送出、或幫新上場的 Agent 補上原本的問題）並要求回覆。 */
  sendText(text: string): void {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
      })
    );
    this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  /** 手動打斷：取消目前正在生成／播放的回覆（也可以直接開口講話，伺服器端會自動偵測並打斷）。 */
  cancelResponse(): void {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(JSON.stringify({ type: "response.cancel" }));
  }

  /** 手動催一下：正常情況下伺服器端 VAD 偵測到講完就會自動生成回覆，這支是保底用——
   * 老闆講完話卻遲遲沒反應（VAD 誤判沒偵測到講完、或换人瞬間的連線競態）時，
   * 由前端主動補一句 response.create，避免整場對話卡死等不到人接話。 */
  nudgeResponse(): void {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  /** 回覆 Agent 呼叫的工具結果。continueResponse=true 會接著要求 Agent 繼續講話
   * （例如 show_result 之後讓它接著唸重點）；換人這種不需要它再開口的情境傳 false。 */
  submitFunctionResult(callId: string, output: unknown, continueResponse: boolean): void {
    if (!this.dc || this.dc.readyState !== "open") return;
    this.dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) },
      })
    );
    if (continueResponse) this.dc.send(JSON.stringify({ type: "response.create" }));
  }

  /** 麥克風軌道意外中斷、重新取得後換上新的軌道，不需要重新走一次 WebRTC 交握。 */
  async replaceMicTrack(newTrack: MediaStreamTrack): Promise<void> {
    const sender = this.pc?.getSenders().find((s) => s.track?.kind === "audio");
    if (sender) await sender.replaceTrack(newTrack);
  }

  private handleEvent(raw: string): void {
    let evt: {
      type?: string;
      delta?: string;
      transcript?: string;
      error?: { message?: string };
      response?: {
        output?: Array<{ type?: string; name?: string; arguments?: string; call_id?: string }>;
        usage?: RealtimeUsage;
      };
    };
    try {
      evt = JSON.parse(raw);
    } catch {
      return;
    }
    switch (evt.type) {
      case "input_audio_buffer.speech_started":
        this.handlers.onUserSpeechStart?.();
        break;
      case "input_audio_buffer.speech_stopped":
        this.handlers.onUserSpeechStop?.();
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (typeof evt.transcript === "string") this.handlers.onUserTranscript?.(evt.transcript.trim());
        break;
      case "response.audio_transcript.delta":
        if (typeof evt.delta === "string") this.handlers.onAssistantTranscriptDelta?.(evt.delta);
        break;
      case "response.audio_transcript.done":
        if (typeof evt.transcript === "string") this.handlers.onAssistantTranscriptDone?.(evt.transcript.trim());
        break;
      case "output_audio_buffer.started":
        this.handlers.onAssistantSpeechStart?.();
        break;
      case "response.done":
        for (const item of evt.response?.output ?? []) {
          if (item?.type === "function_call" && item.name && item.call_id) {
            this.handlers.onFunctionCall?.(item.name, item.arguments ?? "{}", item.call_id);
          }
        }
        if (evt.response?.usage) this.handlers.onUsage?.(evt.response.usage);
        this.handlers.onAssistantSpeechStop?.();
        break;
      case "output_audio_buffer.stopped":
        this.handlers.onAssistantSpeechStop?.();
        break;
      case "error":
        this.handlers.onError?.(evt.error?.message || "即時語音發生錯誤");
        break;
      default:
        break; // 未知事件安靜忽略，不影響連線
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.pc = null;
    this.dc = null;
    this.handlers.onClose?.();
  }
}
