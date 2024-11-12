import React from 'react';
import Calculator from './components/Calculator';
import { CalculatorProvider } from './context/CalculatorContext';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <main className="max-w-4xl mx-auto">
          <CalculatorProvider>
            <Calculator />
          </CalculatorProvider>
        </main>
      </div>
    </div>
  );
}

export default App;