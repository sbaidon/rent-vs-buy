import React from 'react';
import { useCalculator } from '../context/CalculatorContext';

interface Input {
  label: string;
  name: string;
  type: 'currency' | 'percentage';
}

interface InputSectionProps {
  title: string;
  icon: React.ReactNode;
  inputs: Input[];
}

const InputSection: React.FC<InputSectionProps> = ({ title, icon, inputs }) => {
  const { values, updateValue } = useCalculator();

  const formatValue = (value: number, type: string) => {
    if (type === 'currency') return value.toString();
    if (type === 'percentage') return (value * 100).toString();
    return value.toString();
  };

  const handleChange = (name: string, value: string, type: string) => {
    let parsedValue = parseFloat(value);
    if (type === 'percentage') parsedValue = parsedValue / 100;
    if (!isNaN(parsedValue)) {
      updateValue(name, parsedValue);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-4">
        {inputs.map((input) => (
          <div key={input.name}>
            <label htmlFor={input.name} className="block text-sm font-medium text-gray-700">
              {input.label}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {input.type === 'currency' ? '$' : ''}
                </span>
              </div>
              <input
                type="number"
                name={input.name}
                id={input.name}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                value={formatValue(values[input.name] || 0, input.type)}
                onChange={(e) => handleChange(input.name, e.target.value, input.type)}
                step="any"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {input.type === 'percentage' ? '%' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputSection;