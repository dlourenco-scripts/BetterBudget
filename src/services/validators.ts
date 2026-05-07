import * as Yup from 'yup';

// Email validation schema
export const emailSchema = Yup.string()
  .email('Please enter a valid email address')
  .required('Email is required');

// Forgot Password validation schema
export const forgotPasswordValidationSchema = Yup.object().shape({
  email: emailSchema,
});

// Password validation schema
export const passwordSchema = Yup.string()
  .min(8, 'Password must be at least 8 characters')
  .required('Password is required');

// Sign In validation schema
export const signInValidationSchema = Yup.object().shape({
  email: emailSchema,
  password: Yup.string().required('Password is required'),
});

// Sign Up validation schema
export const signUpValidationSchema = Yup.object().shape({
  email: emailSchema,
  password: passwordSchema,
  retypePassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Password mismatch!')
    .required('Retype password is required'),
});

// New Password validation schema
export const newPasswordValidationSchema = Yup.object().shape({
  newPassword: passwordSchema,
  confirmNewPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm new password is required'),
});

// Add Income validation schema
export const addIncomeValidationSchema = Yup.object().shape({
  incomeSourceText: Yup.string().required('Income source is required'),
  incomeAmount: Yup.number()
    .typeError('Please enter a valid amount')
    .positive('Amount must be greater than 0')
    .required('Income amount is required'),
  selectedDate: Yup.string().required('Next pay date is required'),
});

// Recurring Expenses validation schema
export const recurringExpensesValidationSchema = Yup.object().shape({
  expenseName: Yup.string().required('Expense name is required'),
  selectedExpense: Yup.string().required('Please select an expense category'),
  expenseAmount: Yup.number()
    .typeError('Please enter a valid amount')
    .positive('Amount must be greater than 0')
    .required('Expense amount is required'),
  selectedDate: Yup.string().required('Next bill date is required'),
});

// Debt validation schema
export const debtValidationSchema = Yup.object().shape({
  debtName: Yup.string().required('Debt name is required'),
  debtAmount: Yup.number()
    .typeError('Please enter a valid amount')
    .positive('Amount must be greater than 0')
    .required('Debt amount is required'),
});
