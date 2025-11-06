import React from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">Mot de passe oublié</h1>
        <p className="text-center text-gray-600">
          te7chelek wasa3 belek.{' '}
          <Link to="/login" className="text-blue-600 font-semibold">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}