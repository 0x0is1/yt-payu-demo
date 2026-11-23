import React from 'react';
import { LoginForm } from './components/LoginForm';

export const metadata = {
  title: 'Admin Login | PayU Gateway',
};

export default function LoginPage() {
  return (
    <div className="py-12">
      <LoginForm />
    </div>
  );
}

