export const KIOSKS = [
  { id: 'K01', name: 'Kebabwala',   fullName: 'Kebabwala',              code: 'KW', noInvoice: false },
  { id: 'K02', name: 'Fonda',       fullName: 'Tacos Fonda',            code: 'TF', noInvoice: false },
  { id: 'K03', name: 'Kam Rai',     fullName: 'Kam Rai Thai',           code: 'KR', noInvoice: false },
  { id: 'K04', name: 'Paninoteca',  fullName: 'Paninoteca by Anthony',  code: 'PA', noInvoice: false },
  { id: 'K05', name: 'Fornino',     fullName: 'Fornino',                code: 'FO', noInvoice: false },
  { id: 'K06', name: 'Smashed',     fullName: 'Smashed Express',        code: 'SE', noInvoice: false },
  { id: 'K07', name: 'BKLYN Wild',  fullName: 'BKLYN Wild',             code: 'BW', noInvoice: false },
  { id: 'K08', name: 'Bar',         fullName: 'Bar',                    code: 'BR', noInvoice: true  },
]

export const PRODUCTS = [
  { id: 'sb-still',     name: 'San Bene Still 330ml',     invName: 'SanBenedetto Still 330ml',                                   defaultPrice: 29.95, vendor: 'AceEndico',    trackerCategory: 'water', hasDeposit: true  },
  { id: 'sb-sparkling', name: 'San Bene Sparkling 330ml', invName: 'SanBenedetto Sparkling 330ml',                               defaultPrice: 29.95, vendor: 'AceEndico',    trackerCategory: 'water', hasDeposit: true  },
  { id: 'sb-still-can', name: 'San Bene Still Can 330ml', invName: 'SanBenedetto Still Can 330ml',                               defaultPrice: 18.28, vendor: 'AceEndico',    trackerCategory: 'water', hasDeposit: false },
  { id: 'coke',         name: 'Coke Bottle',              invName: 'Coke 12oz bottles',                                          defaultPrice: 41.68, vendor: 'Driscoll',     trackerCategory: 'soda',  hasDeposit: false },
  { id: 'diet-coke',    name: 'Diet Coke Bottle',         invName: 'Diet Coke 8oz bottles',                                      defaultPrice: 36.37, vendor: 'Driscoll',     trackerCategory: 'soda',  hasDeposit: false },
  { id: 'sprite',       name: 'Sprite Bottle',            invName: 'Sprite 12oz bottles',                                        defaultPrice: 42.51, vendor: 'Driscoll',     trackerCategory: 'soda',  hasDeposit: false },
  { id: 'paper-bag',    name: 'Time Out Bag',             invName: 'Custom Paper Handle Bag "Bristo" 10x7x13" / 100 / Kraft',   defaultPrice: 28.66, vendor: 'ThinkPackage', trackerCategory: 'bags',  hasDeposit: false },
]

export const VENDORS = ['AceEndico', 'Driscoll', 'ThinkPackage', 'Other']

// Vendor ordering constraints and schedules
// cutoffDays: JS day-of-week (0=Sun, 1=Mon … 6=Sat)
export const VENDOR_INFO = {
  AceEndico:    { minCases: null, minDollars: 500,  cutoffHour: 16, cutoffDays: [1,2,3,4,5], deliveryNote: 'Next business day' },
  Driscoll:     { minCases: 20,   minDollars: null, cutoffHour: 16, cutoffDays: [1,2,3,4,5], deliveryNote: 'Next business day' },
  ThinkPackage: { minCases: 10,   minDollars: null, cutoffHour: 11, cutoffDays: [3,5],        deliveryNote: 'Wed 11am → Thu/Fri · Fri 11am → Mon/Tue' },
}

export const TAX_RATE = 0.08875
export const DEPOSIT_PER_CASE = 1.20
export const LOW_THRESHOLD = 5

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
