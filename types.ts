
export enum InvoiceStatus {
  DRAFT = 'Rascunho',
  PENDING = 'Pendente',
  PAID = 'Pago',
  PARTIAL = 'Parcelar',
  OVERDUE = 'Vencido',
  CANCELLED = 'Anulado'
}

export enum IntegrationStatus {
  EMITTED = 'Emitido',
  VALIDATED = 'Validado',
  ACCOUNTED = 'Contabilizado',
  REPORTED = 'Reportado AGT'
}

export enum InvoiceType {
  FT = 'Fatura',
  FR = 'Fatura/Recibo',
  PP = 'Fatura Pró-forma',
  OR = 'Orçamento',
  GR = 'Guia de Remessa',
  GT = 'Guia de Transporte',
  GE = 'Guia de Entrega',
  NE = 'Nota de Encomenda',
  NC = 'Nota de Crédito',
  ND = 'Nota de Débito',
  RG = 'Recibo',
  VD = 'Venda a Dinheiro',
  FS = 'Fatura Simplificada'
}

export enum PurchaseType {
  FT = 'Fatura Fornecedor',
  FR = 'Fatura/Recibo Fornecedor',
  ND = 'Nota de Débito',
  NC = 'Nota de Crédito',
  VD = 'Venda a Dinheiro',
  REC = 'Recibo'
}

export enum POSArea {
  RETAIL = 'Venda de Balcão / Loja',
  RESTAURANT = 'Restaurante / Bar',
  HOTEL = 'Hotelaria / Alojamento',
  CORPORATE = 'Vendas Corporativas'
}

export type PaymentMethod = 'CASH' | 'MULTICAIXA' | 'TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MCX_EXPRESS' | 'OTHERS' | 'CREDIT_ACCOUNT';

export type LicensePlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type CompanyStatus = 'TEST' | 'ACTIVE' | 'SUSPENDED';

export type AppLanguage = 'PT' | 'EN' | 'FR';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; 
  time?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type ViewState = 
  | 'DASHBOARD' 
  | 'WORKSPACE' 
  | 'SECRETARIA_LIST' 
  | 'SECRETARIA_FORM'
  | 'ARCHIVES'
  | 'INVOICES_GROUP' 
  | 'CREATE_INVOICE' 
  | 'INVOICES' 
  | 'ACCOUNTING_REGULARIZATION' 
  | 'CLIENTS' 
  | 'PURCHASES_GROUP' 
  | 'CREATE_PURCHASE' 
  | 'PURCHASES' 
  | 'SUPPLIERS' 
  | 'PURCHASE_ANALYSIS' 
  | 'STOCK_GROUP' 
  | 'STOCK' 
  | 'FINANCE_GROUP' 
  | 'FINANCE_CASH' 
  | 'FINANCE_MAPS' 
  | 'FINANCE_REPORTS' 
  | 'FINANCE_TAX_DOCS'
  | 'ACCOUNTING_GROUP' 
  | 'ACCOUNTING_VAT' 
  | 'ACCOUNTING_PGC' 
  | 'ACCOUNTING_CLASSIFY_GROUP'
  | 'ACCOUNTING_CLASSIFY_SALES'
  | 'ACCOUNTING_CLASSIFY_PURCHASES'
  | 'ACCOUNTING_CLASSIFY_SALARY_PROC'
  | 'ACCOUNTING_CLASSIFY_SALARY_PAY' 
  | 'ACCOUNTING_RUBRICAS_GROUP'
  | 'ACCOUNTING_RUBRICAS_SALES'
  | 'ACCOUNTING_RUBRICAS_PURCHASES'
  | 'ACCOUNTING_MAPS'
  | 'ACCOUNTING_DECLARATIONS'
  | 'ACCOUNTING_TAXES'
  | 'ACCOUNTING_CALC'
  | 'ACCOUNTING_SAFT'
  | 'ACCOUNTING_OPENING_BALANCE'
  | 'ACCOUNTING_ACCOUNT_EXTRACT'
  | 'HR_GROUP'
  | 'HR'
  | 'HR_EMPLOYEES'
  | 'HR_PERFORMANCE'
  | 'HR_CONTRACT_ISSUE'
  | 'SETTINGS'
  | 'POS_GROUP'
  | 'POS'
  | 'CASH_CLOSURE'
  | 'CASH_CLOSURE_HISTORY'
  | 'POS_SETTINGS'
  | 'SCHOOL_GROUP'
  | 'SCHOOL_STUDENTS'
  | 'SCHOOL_TEACHERS'
  | 'SCHOOL_ACADEMIC'
  | 'SCHOOL_DOCUMENTS'
  | 'SCHOOL_REPORTS'
  | 'RESTAURANT_GROUP'
  | 'RESTAURANT_MENU'
  | 'RESTAURANT_TABLES'
  | 'RESTAURANT_KDS'
  | 'RESTAURANT_PRODUCTION'
  | 'HOTEL_GROUP'
  | 'HOTEL_ROOMS'
  | 'HOTEL_RESERVATIONS'
  | 'HOTEL_CHECKIN'
  | 'HOTEL_GOVERNANCE'
  | 'REPORTS_GROUP'
  | 'REPORTS_MONTHLY'
  | 'REPORTS_YEARLY'
  | 'REPORTS_DEBTS'
  | 'REPORTS_MOVEMENTS';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'OPERATOR' | 'ACCOUNTANT';
  companyId: string;
  permissions: ViewState[];
  createdAt: string;
  avatar?: string;
  workLocationId?: string;
}

export interface Company {
  id: string;
  name: string;
  nif: string;
  address: string;
  email: string;
  phone: string;
  regime: string;
  licensePlan: LicensePlan;
  status: CompanyStatus;
  validUntil: string;
  registrationDate: string;
  logo?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  accountBalance: number;
  initialBalance: number;
  clientType: string;
  province: string;
  municipality?: string;
  postalCode?: string;
  webPage?: string;
  iban?: string;
  isAccountShared?: boolean;
  transactions: any[];
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  managerName?: string;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  seriesId: string;
  seriesCode?: string;
  number: string;
  date: string;
  time?: string;
  dueDate: string;
  accountingDate: string;
  clientId: string;
  clientName: string;
  clientNif?: string;
  items: InvoiceItem[];
  subtotal: number;
  globalDiscount: number;
  taxRate: number;
  taxAmount: number;
  withholdingAmount?: number;
  retentionType?: 'NONE' | 'CAT_50' | 'CAT_100';
  retentionAmount?: number;
  total: number;
  currency?: string;
  exchangeRate?: number;
  contraValue?: number;
  status: InvoiceStatus;
  paidAmount?: number;
  isCertified: boolean;
  hash?: string;
  companyId: string;
  workLocationId?: string;
  paymentMethod?: PaymentMethod;
  cashRegisterId?: string;
  operatorName?: string;
  notes?: string;
  source?: 'MANUAL' | 'POS';
  integrationStatus?: IntegrationStatus;
  processedAt?: string;
  targetWarehouseId?: string;
  cancellationReason?: string;
  attachment?: string;
  deliveryAddress?: string;
  sourceInvoiceId?: string;
  typology?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  type: 'PRODUCT' | 'SERVICE';
  description: string;
  reference?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  expiryDate?: string;
  valueDate?: string;
  showMetrics?: boolean;
  length?: number;
  width?: number;
  height?: number;
  rubrica?: string;
}

export interface Purchase {
  id: string;
  type: PurchaseType;
  supplierId: string;
  supplier: string;
  nif: string;
  date: string;
  dueDate: string;
  documentNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  notes?: string;
  hash?: string;
  workLocationId?: string;
  warehouseId?: string;
  paymentMethod?: PaymentMethod;
  cashRegisterId?: string;
  integrationStatus?: IntegrationStatus;
  processedAt?: string;
  currency?: string;
  exchangeRate?: number;
  retentionType?: 'NONE' | 'CAT_50' | 'CAT_100';
  globalDiscount?: number;
  attachment?: string;
}

export interface PurchaseItem {
  id: string;
  productId?: string;
  description: string;
  reference?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  rubrica: string;
  warehouseId?: string;
  itemType: string;
  length?: number;
  width?: number;
  height?: number;
  showMetrics?: boolean;
  withholdingRate?: number;
  withholdingAmount?: number;
  expiryDate?: string;
  unit?: string;
}

export interface Product {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  unit: string;
  category: string;
  stock: number;
  warehouseId: string;
  priceTableId: string;
  minStock: number;
  barcode?: string;
  imageUrl?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description?: string;
  managerName?: string;
  contact?: string;
  observations?: string;
}

export interface DocumentSeries {
  id: string;
  name: string;
  code: string;
  type: 'NORMAL' | 'MANUAL' | 'POS';
  year: number;
  currentSequence: number;
  sequences: Record<string, number>;
  isActive: boolean;
  allowedUserIds: string[];
  bankDetails?: string;
  footerText?: string;
  logo?: string;
}

export interface CashRegister {
  id: string;
  name: string;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED';
  balance: number;
  initialBalance: number;
  operatorId?: string;
  notes?: string;
}

export interface PriceTable {
  id: string;
  name: string;
  percentage: number;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'ENTRY' | 'EXIT';
  productId: string;
  productName: string;
  quantity: number;
  warehouseId: string;
  documentRef: string;
  notes?: string;
  expiryDate?: string;
  itemType?: string;
}

export interface Employee {
  id: string;
  employeeNumber?: string;
  name: string;
  nif: string;
  biNumber: string;
  ssn: string;
  role: string;
  category?: string;
  department: string;
  baseSalary: number;
  status: 'Active' | 'Terminated' | 'OnLeave';
  admissionDate: string;
  terminationDate?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  iban?: string;
  photoUrl?: string;
  contractType: 'Determinado' | 'Indeterminado' | 'Estagio';
  subsidyTransport: number;
  subsidyFood: number;
  subsidyFamily: number;
  subsidyHousing: number;
  subsidyChristmas?: number;
  subsidyVacation?: number;
  subsidyOther?: number;
  gender: 'M' | 'F';
  birthDate: string;
  maritalStatus: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viuvo';
  nationality?: string;
  address: string;
  municipality: string;
  neighborhood: string;
  workLocationId: string;
  companyId?: string;
  performanceScore?: number;
  turnoverRisk: 'Low' | 'Medium' | 'High';
  contractClauses?: string[];
  professionId?: string;
  professionName?: string;
}

export interface SalarySlip {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  baseSalary: number;
  allowances: number;
  bonuses: number;
  subsidies: number;
  subsidyTransport: number;
  subsidyFood: number;
  subsidyFamily: number;
  subsidyHousing: number;
  absences: number;
  advances: number;
  grossTotal: number;
  inss: number;
  irt: number;
  netTotal: number;
  professionCode?: string;
}

export interface HrTransaction {
  id: string;
  employeeId: string;
  date: string;
  type: 'BONUS' | 'ALLOWANCE' | 'ABSENCE' | 'ADVANCE';
  amount: number;
  description: string;
  processed: boolean;
}

export interface HrVacation {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  year: number;
}

export interface Supplier {
  id: string;
  name: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  accountBalance: number;
  supplierType: string;
  transactions: any[];
  municipality?: string;
  postalCode?: string;
  country?: string;
  webPage?: string;
  inssNumber?: string;
  bankInitials?: string;
  iban?: string;
  swift?: string;
}

export interface CashMovement {
  id: string;
  date: string;
  type: 'ENTRY' | 'EXIT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: number;
  description: string;
  cashRegisterId: string;
  targetCashRegisterId?: string;
  operatorName: string;
  source: 'SALES' | 'PURCHASES' | 'MANUAL';
  documentRef?: string;
}

export interface WorkProject {
  id: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  title: string;
  code: string;
  personnelPerDay: number;
  totalPersonnel: number;
  location: string;
  description?: string;
  contact?: string;
  observations?: string;
}

export interface PGCAccount {
  id: string;
  code: string;
  description: string;
  type: 'CLASSE' | 'GRUPO' | 'SUBGRUPO' | 'CONTA' | 'SUBCONTA';
  nature: 'DEBITO' | 'CREDITO' | 'AMBOS';
  parentCode?: string;
  systemAuto: boolean;
}

export interface SecretariaDocument {
  id: string;
  type: string;
  seriesId: string;
  seriesCode: string;
  number: string;
  date: string;
  destinatarioNome: string;
  destinatarioIntro: string;
  assunto: string;
  corpo: string;
  confidencial: boolean;
  imprimirPagina: boolean;
  createdBy: string;
  createdAt: string;
  isLocked: boolean;
  departamento: string;
  dateExtended?: string;
  destinatarioLocalidade?: string;
  destinatarioPais?: string;
}

export interface VatSettlement {
  id: string;
  month: number;
  year: number;
  dateProcessed: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  status: 'PENDING' | 'PROCESSED';
  details: {
    salesAdjust: number;
    purchaseAdjust: number;
  };
}

export interface OpeningBalance {
  id: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
  year: number;
  balanceType: 'DEBIT' | 'CREDIT';
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface POSConfig {
  defaultSeriesId: string;
  printerType: '80mm' | 'A4';
  autoPrint: boolean;
  allowDiscounts: boolean;
  defaultClientId: string;
  defaultPaymentMethod: PaymentMethod;
  showImages: boolean;
  quickMode: boolean;
}

export interface Contract {
  id: string;
  employeeId: string;
  type: 'Determinado' | 'Indeterminado' | 'Estagio';
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Expired' | 'Terminated';
  clauses: string[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Late';
  justification?: string;
  overtimeHours?: number;
}

export interface Profession {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  group?: string;
}

export interface CashClosure {
  id: string;
  date: string;
  openedAt: string;
  closedAt: string;
  operatorId: string;
  operatorName: string;
  cashRegisterId: string;
  expectedCash: number;
  expectedMulticaixa: number;
  expectedTransfer: number;
  expectedCredit: number;
  totalSales: number;
  actualCash: number;
  difference: number;
  initialBalance: number;
  finalBalance: number;
  status: 'CLOSED';
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  date: string;
  score: number;
}

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  date: string;
  description: string;
}

export interface TrainingCourse {
  id: string;
  name: string;
  provider: string;
}

export interface SchoolStudent {
  id: string;
  registrationNumber: string;
  name: string;
  birthDate: string;
  gender: 'M' | 'F';
  address: string;
  parentName: string;
  parentPhone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SchoolTeacher {
  id: string;
  name: string;
  nif: string;
  specialization: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SchoolClass {
  id: string;
  name: string;
  courseId: string;
  roomNumber: string;
  period: 'MANHÃ' | 'TARDE' | 'NOITE';
  year: number;
  capacity: number;
}

export interface SchoolCourse {
  id: string;
  name: string;
}

export interface SchoolGrade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  grade: number;
}

export interface SchoolAttendance {
  id: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
}

export interface SchoolOccurrence {
  id: string;
  studentId: string;
  date: string;
  description: string;
}

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrderValue?: number;
}

export interface HotelRoom {
  id: string;
  number: string;
  type: 'SINGLE' | 'DOUBLE' | 'SUITE' | 'MASTER';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';
  dailyRate: number;
}

export interface HotelReservation {
  id: string;
  guestName: string;
  guestDoc?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  totalValue: number;
}

export interface HotelConsumption {
  id: string;
  reservationId: string;
  description: string;
  category: 'RESTAURANT' | 'LAUNDRY' | 'MINIBAR' | 'OTHER';
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
}

export interface ArchiveDocument {
  id: string;
  name: string;
  type: 'Administrativo' | 'Empresa' | 'Corporativo' | 'Clientes' | 'Outros';
  observations: string;
  contact: string;
  responsible: string;
  date: string;
  fileUrl?: string;
  isSigned: boolean;
  associatedDocNo?: string;
  occurrences: ArchiveOccurrence[];
}

export interface ArchiveOccurrence {
  id: string;
  date: string;
  description: string;
  user: string;
}

export interface TaxDocument {
  id: string;
  dateDoc: string;
  dateContab: string;
  name: string;
  description: string;
  reference: string;
  amountPaid: number;
  observations: string;
  fileUrl?: string;
  fileName?: string;
  occurrences: TaxOccurrence[];
}

export interface TaxOccurrence {
  id: string;
  date: string;
  description: string;
  user: string;
}
