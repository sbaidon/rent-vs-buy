import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import AmortizationTable from "./amortization-table";

interface AmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AmortizationModal: React.FC<AmortizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-acadia-950 rounded-lg shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: "calc(100vh - 40px)" }}
      >
        <div className="flex items-center justify-between bg-amber-950 text-white p-4 rounded-t-lg border-b border-amber-900">
          <h2 className="text-xl font-medium text-amber-100">
            {t("calculator.amortization.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white rounded-full p-2 hover:bg-amber-900/50 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <AmortizationTable />
        </div>
        <div className="border-t border-amber-900 p-4 flex justify-end bg-amber-950 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-900 text-white rounded hover:bg-amber-800 transition-colors"
          >
            {t("calculator.amortization.close")}
          </button>
        </div>
      </div>

      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(146, 64, 14, 0.3);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(146, 64, 14, 0.5);
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(146, 64, 14, 0.3) rgba(0, 0, 0, 0.1);
          }
        `}
      </style>
    </div>
  );
};

export default AmortizationModal;
