
export enum SeniorityLevel {
  ENTRY = 'Entry Level',
  JUNIOR = 'Junior',
  MID = 'Mid-Level',
  SENIOR = 'Senior',
  LEAD = 'Lead/Staff',
  EXECUTIVE = 'Executive (VP, C-Suite)'
}

export interface ResumeData {
  content: string;
  targetTitle: string;
  seniority: SeniorityLevel;
  jobDescription?: string;
  additionalContext?: string;
}

export interface OptimizationResult {
  optimizedContent: string;
  keyChanges: string[];
  suggestedSkills: string[];
  atsScore: number;
}
