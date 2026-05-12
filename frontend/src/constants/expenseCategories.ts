import {appImages} from '@/constants/assets';

export const expenseCategoryGroups = [
  {
    title: 'Essentials',
    items: [
      {icon: appImages.Housing, label: 'Housing'},
      {icon: appImages.Dropletbolt, label: 'Utilities'},
      {icon: appImages.Phone, label: 'Phone'},
      {icon: appImages.TvSet, label: 'TV/Internet'},
      {icon: appImages.Grocery, label: 'Groceries'},
      {icon: appImages.Transportation, label: 'Transportation'},
      {icon: appImages.Fuel, label: 'Fuel'},
      {icon: appImages.Maintainence, label: 'Auto Maintenance'},
      {icon: appImages.Medical, label: 'Medical & Health Care'},
      {icon: appImages.Subscription, label: 'Subscriptions'},
      {icon: appImages.Insurance, label: 'Insurance'},
    ],
  },
  {
    title: 'Financial Obligations',
    items: [
      {icon: appImages.Loan, label: 'Loan Payment'},
      {icon: appImages.Tax, label: 'Taxes'},
      {icon: appImages.childExpense, label: 'Child Expense'},
      {icon: appImages.Education, label: 'Education'},
    ],
  },
  {
    title: 'Lifestyle',
    items: [
      {icon: appImages.Personal, label: 'Personal Use'},
      {icon: appImages.Clothing, label: 'Clothing'},
      {icon: appImages.Entertainment, label: 'Entertainment'},
      {icon: appImages.Dining, label: 'Dining Out'},
      {icon: appImages.Healthfitness, label: 'Health & Fitness'},
      {icon: appImages.Travel, label: 'Travel'},
      {icon: appImages.Vacations, label: 'Vacations'},
    ],
  },
];
