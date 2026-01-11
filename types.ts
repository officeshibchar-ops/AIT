
export interface RentRecord {
  id: string;
  userId: string; // Associated user ID
  tenantName: string;
  flatNumber: string;
  mobileNumber: string;
  rentMonth: string;
  rentAmount: number;
  paymentDate: string;
  receiptNumber: string;
  paymentMethod: 'Cash' | 'Bank' | 'MFS';
  bankName?: string;
  accountNumber?: string;
  branch?: string;
  mfsNumber?: string;
}

export interface User {
  id: string;
  fullName: string;
  propertyName?: string; // New field for Landlords
  role: 'Landlord' | 'Tenant';
  mobileNumber: string;
  password?: string;
  profilePicture?: string; // Base64 string
  propertyOwnerId?: string; // Required for Tenants to link to a Landlord
}

export type Month = 
  | 'January' | 'February' | 'March' | 'April' 
  | 'May' | 'June' | 'July' | 'August' 
  | 'September' | 'October' | 'November' | 'December';

export const MONTHS: Month[] = [
  'January', 'February', 'March', 'April', 
  'May', 'June', 'July', 'August', 
  'September', 'October', 'November', 'December'
];

export const BANKS = [
  'Sonali Bank Plc',
  'IFIC Bank Plc',
  'Rupali Bank Plc',
  'Modhumoti bank Plc'
];

export const BRANCHES = [
  'Madaripur',
  'Shibchar',
  'Panchar'
];
