import { forwardRef, useCallback } from "react";
import { Button } from "./button";
import { Printer, Download } from "lucide-react";
import { cn } from "./utils";

// Receipt document types
export type ReceiptType = "sales-order" | "cash-receipt" | "payment-voucher" | "purchase-order";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  // Document info
  type: ReceiptType;
  documentNumber: string;
  documentDate: string;
  
  // Party info (customer or supplier)
  partyType: "Customer" | "Supplier";
  partyName: string;
  partyAddress?: string;
  partyCity?: string;
  partyCountry?: string;
  
  // Reference numbers
  referenceNumber?: string; // Invoice number, Bill number, etc.
  referenceLabel?: string; // "Invoice No.", "Bill No.", etc.
  
  // Line items (for orders)
  items?: ReceiptLineItem[];
  
  // Amounts
  subtotal?: number;
  totalAmount: number;
  amountPaid?: number;
  balance?: number;
  
  // Payment info
  paymentMode?: string;
  
  // Status
  status?: string;
  
  // Additional info
  notes?: string;
  createdBy?: string;
  expectedDeliveryDate?: string;
  
  // For approvals
  approvedBy?: string;
  approvedDate?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getDocumentTitle = (type: ReceiptType): string => {
  switch (type) {
    case "sales-order": return "SALES ORDER / INVOICE";
    case "cash-receipt": return "OFFICIAL RECEIPT";
    case "payment-voucher": return "PAYMENT VOUCHER";
    case "purchase-order": return "PURCHASE ORDER";
    default: return "DOCUMENT";
  }
};

const getDocumentSubtitle = (type: ReceiptType): string => {
  switch (type) {
    case "sales-order": return "Customer Copy";
    case "cash-receipt": return "Receipt of Payment";
    case "payment-voucher": return "Supplier Payment";
    case "purchase-order": return "Supplier Copy";
    default: return "";
  }
};

interface PrintableReceiptProps {
  data: ReceiptData;
  className?: string;
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ data, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white text-black p-8 max-w-[800px] mx-auto print:p-4 print:max-w-none",
          className
        )}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold tracking-wide">WAREHOUSE MANAGEMENT SYSTEM</h1>
          <p className="text-sm text-gray-600 mt-1">Inventory and Supply Chain Coordination</p>
          <div className="mt-4">
            <h2 className="text-xl font-semibold">{getDocumentTitle(data.type)}</h2>
            <p className="text-sm text-gray-500">{getDocumentSubtitle(data.type)}</p>
          </div>
        </div>

        {/* Document Info Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Document No.</p>
            <p className="font-semibold text-lg">{data.documentNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-semibold">{formatDate(data.documentDate)}</p>
          </div>
        </div>

        {/* Party Info */}
        <div className="bg-gray-50 p-4 rounded mb-6 print:bg-gray-100">
          <p className="text-sm text-gray-600 mb-1">{data.partyType}</p>
          <p className="font-semibold text-lg">{data.partyName}</p>
          {(data.partyCity || data.partyCountry) && (
            <p className="text-sm text-gray-600">
              {[data.partyCity, data.partyCountry].filter(Boolean).join(", ")}
            </p>
          )}
          {data.partyAddress && (
            <p className="text-sm text-gray-600">{data.partyAddress}</p>
          )}
        </div>

        {/* Reference Number */}
        {data.referenceNumber && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">{data.referenceLabel || "Reference No."}: </span>
            <span className="font-medium">{data.referenceNumber}</span>
          </div>
        )}

        {/* Line Items Table */}
        {data.items && data.items.length > 0 && (
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm w-20">Qty</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm w-28">Unit Price</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.description}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{item.quantity}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Section */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            {data.subtotal !== undefined && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm">{formatCurrency(data.subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-black font-bold">
              <span>Total Amount:</span>
              <span>{formatCurrency(data.totalAmount)}</span>
            </div>
            {data.amountPaid !== undefined && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-gray-600">Amount Paid:</span>
                <span className="text-sm">{formatCurrency(data.amountPaid)}</span>
              </div>
            )}
            {data.balance !== undefined && (
              <div className="flex justify-between py-1 font-semibold">
                <span>Balance Due:</span>
                <span className={data.balance > 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(data.balance)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Mode */}
        {data.paymentMode && (
          <div className="bg-gray-50 p-3 rounded mb-4 print:bg-gray-100">
            <span className="text-sm text-gray-600">Payment Method: </span>
            <span className="font-medium">{data.paymentMode}</span>
          </div>
        )}

        {/* Status */}
        {data.status && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">Status: </span>
            <span className="font-medium px-2 py-1 bg-gray-200 rounded text-sm">{data.status}</span>
          </div>
        )}

        {/* Expected Delivery */}
        {data.expectedDeliveryDate && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">Expected Delivery: </span>
            <span className="font-medium">{formatDate(data.expectedDeliveryDate)}</span>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="border-t border-gray-200 pt-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Notes:</p>
            <p className="text-sm">{data.notes}</p>
          </div>
        )}

        {/* Approval Info */}
        {data.approvedBy && (
          <div className="mb-4">
            <span className="text-sm text-gray-600">Approved By: </span>
            <span className="font-medium">{data.approvedBy}</span>
            {data.approvedDate && (
              <span className="text-sm text-gray-500 ml-2">on {formatDate(data.approvedDate)}</span>
            )}
          </div>
        )}

        {/* Signatures Section */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-300">
          <div className="text-center">
            <div className="border-b border-black mb-2 h-12"></div>
            <p className="text-sm text-gray-600">Prepared By</p>
            {data.createdBy && <p className="text-xs mt-1">{data.createdBy}</p>}
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-2 h-12"></div>
            <p className="text-sm text-gray-600">Received By</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>This is a computer-generated document. No signature required unless specified.</p>
          <p className="mt-1">Printed on: {new Date().toLocaleString("en-PH")}</p>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = "PrintableReceipt";

// Print Button Component
interface PrintReceiptButtonProps {
  onPrint: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function PrintReceiptButton({
  onPrint,
  variant = "outline",
  size = "sm",
  className,
  label = "Print",
}: PrintReceiptButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onPrint}
      className={className}
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

// Hook for printing
export function usePrintReceipt() {
  const printReceipt = useCallback((receiptData: ReceiptData) => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }

    const documentTitle = getDocumentTitle(receiptData.type);

    // Build HTML content
    const htmlContent = buildPrintHTML(receiptData, documentTitle);

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }, []);

  return { printReceipt };
}

function buildPrintHTML(data: ReceiptData, title: string): string {
  const formatCurrencyStr = (amount: number) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

  const formatDateStr = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const itemsHTML = data.items?.map(item => `
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.description}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${item.quantity}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${formatCurrencyStr(item.unitPrice)}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${formatCurrencyStr(item.total)}</td>
    </tr>
  `).join("") || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - ${data.documentNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; margin-bottom: 5px; }
        .header h2 { font-size: 16px; margin-top: 10px; }
        .header p { font-size: 12px; color: #666; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .party-box { background: #f5f5f5; padding: 15px; margin-bottom: 15px; }
        .party-box .label { font-size: 12px; color: #666; }
        .party-box .name { font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        .totals { text-align: right; margin: 15px 0; }
        .totals .row { display: flex; justify-content: flex-end; padding: 5px 0; }
        .totals .label { width: 150px; text-align: right; margin-right: 20px; }
        .totals .value { width: 120px; text-align: right; }
        .totals .total-row { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
        .notes { border-top: 1px solid #ccc; padding-top: 15px; margin-top: 15px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-box { width: 45%; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>WAREHOUSE MANAGEMENT SYSTEM</h1>
        <p>Inventory and Supply Chain Coordination</p>
        <h2>${title}</h2>
        <p>${getDocumentSubtitle(data.type)}</p>
      </div>

      <div class="info-row">
        <div>
          <p style="font-size: 12px; color: #666;">Document No.</p>
          <p style="font-size: 18px; font-weight: bold;">${data.documentNumber}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; color: #666;">Date</p>
          <p style="font-weight: bold;">${formatDateStr(data.documentDate)}</p>
        </div>
      </div>

      <div class="party-box">
        <p class="label">${data.partyType}</p>
        <p class="name">${data.partyName}</p>
        ${data.partyCity || data.partyCountry ? `<p style="font-size: 12px; color: #666;">${[data.partyCity, data.partyCountry].filter(Boolean).join(", ")}</p>` : ""}
      </div>

      ${data.referenceNumber ? `
        <p style="margin-bottom: 15px;">
          <span style="color: #666;">${data.referenceLabel || "Reference No."}: </span>
          <strong>${data.referenceNumber}</strong>
        </p>
      ` : ""}

      ${data.items && data.items.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Unit Price</th>
              <th style="text-align: right; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      ` : ""}

      <div class="totals">
        <div class="row total-row">
          <span class="label">Total Amount:</span>
          <span class="value">${formatCurrencyStr(data.totalAmount)}</span>
        </div>
        ${data.amountPaid !== undefined ? `
          <div class="row">
            <span class="label">Amount Paid:</span>
            <span class="value">${formatCurrencyStr(data.amountPaid)}</span>
          </div>
        ` : ""}
        ${data.balance !== undefined ? `
          <div class="row" style="font-weight: bold;">
            <span class="label">Balance Due:</span>
            <span class="value" style="color: ${data.balance > 0 ? '#c00' : '#0a0'}">${formatCurrencyStr(data.balance)}</span>
          </div>
        ` : ""}
      </div>

      ${data.paymentMode ? `
        <div style="background: #f5f5f5; padding: 10px; margin: 15px 0;">
          <span style="color: #666;">Payment Method: </span>
          <strong>${data.paymentMode}</strong>
        </div>
      ` : ""}

      ${data.status ? `
        <p style="margin: 10px 0;">
          <span style="color: #666;">Status: </span>
          <span style="background: #e0e0e0; padding: 3px 8px; border-radius: 3px;">${data.status}</span>
        </p>
      ` : ""}

      ${data.expectedDeliveryDate ? `
        <p style="margin: 10px 0;">
          <span style="color: #666;">Expected Delivery: </span>
          <strong>${formatDateStr(data.expectedDeliveryDate)}</strong>
        </p>
      ` : ""}

      ${data.notes ? `
        <div class="notes">
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Notes:</p>
          <p>${data.notes}</p>
        </div>
      ` : ""}

      ${data.approvedBy ? `
        <p style="margin: 10px 0;">
          <span style="color: #666;">Approved By: </span>
          <strong>${data.approvedBy}</strong>
          ${data.approvedDate ? `<span style="color: #666; margin-left: 10px;">on ${formatDateStr(data.approvedDate)}</span>` : ""}
        </p>
      ` : ""}

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p style="font-size: 12px; color: #666;">Prepared By</p>
          ${data.createdBy ? `<p style="font-size: 10px;">${data.createdBy}</p>` : ""}
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p style="font-size: 12px; color: #666;">Received By</p>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. No signature required unless specified.</p>
        <p>Printed on: ${new Date().toLocaleString("en-PH")}</p>
      </div>
    </body>
    </html>
  `;
}

