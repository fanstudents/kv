export interface GoalDeletePort {
  remove(id: string): Promise<void>;
}
