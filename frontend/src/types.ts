export type Role = "ADMIN" | "SCHOOL";

export type Subscription = {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  maxStudents: number;
};

export type School = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  country: string | null;
  active: boolean;
  subscriptionId: string | null;
  subscription?: Subscription | null;
};

export type User = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId: string | null;
  isActive: boolean;
  school?: School | null;
};

export type Formation = {
  id: string;
  name: string;
  code: string;
  year: string;
  schoolId?: string;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolId?: string;
  formationId: string | null;
  status: "PENDING" | "ADMITTED" | "FAILED";
  passed: boolean;
  certified: boolean;
  graduationYear: string;
  formation?: Formation | null;
  certificates?: Array<{
    code: string;
    issuedAt: string;
  }>;
};

export type DashboardStats = {
  students: number;
  formations: number;
  certificates: number;
  admitted: number;
  failed: number;
  pending: number;
  certified: number;
  growthRate: number;
};

export type FormationStat = {
  id: string;
  name: string;
  total: number;
  admitted: number;
  certified: number;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  title: string;
  signerName: string;
  signerRole: string;
  footerText: string;
  accentColor: string;
  isDefault?: boolean;
};

export type Certificate = {
  id: string;
  code: string;
  verificationUrl: string;
  qrCodeDataUrl: string;
  issuedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    formation?: Formation | null;
  };
  school?: School | null;
  template?: CertificateTemplate | null;
};

export type CertificatePreview = {
  code: string;
  verificationUrl: string;
  qrCodeDataUrl: string;
  studentName: string;
  schoolName: string;
  formationName: string;
  title: string;
  signerName: string;
  signerRole: string;
  footerText: string;
  accentColor: string;
  issuedAt: string;
};
