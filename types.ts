
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
  externalFeedback?: string;
}

export interface OptimizationResult {
  optimizedContent: string;
  keyChanges: string[];
  suggestedSkills: string[];
  atsScore: number;
}

export interface OfferAnalysisData {
  offerContent: string;
  position: string;
  companySize: string;
}

export interface OfferAnalysisResult {
  analysis: string;
  pros: string[];
  cons: string[];
  negotiationPoints: string[];
  marketAlignmentScore: number;
}
