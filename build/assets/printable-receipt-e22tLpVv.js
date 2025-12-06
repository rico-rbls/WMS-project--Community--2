import{c as x,r as c,j as t,d as m}from"./index-EAA6tnxt.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]],u=x("download",y),a=e=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(e),l=e=>new Date(e).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}),p=e=>{switch(e){case"sales-order":return"SALES ORDER / INVOICE";case"cash-receipt":return"OFFICIAL RECEIPT";case"payment-voucher":return"PAYMENT VOUCHER";case"purchase-order":return"PURCHASE ORDER";default:return"DOCUMENT"}},d=e=>{switch(e){case"sales-order":return"Customer Copy";case"cash-receipt":return"Receipt of Payment";case"payment-voucher":return"Supplier Payment";case"purchase-order":return"Supplier Copy";default:return""}},h=c.forwardRef(({data:e,className:i},s)=>t.jsxs("div",{ref:s,className:m("bg-white text-black p-8 max-w-[800px] mx-auto print:p-4 print:max-w-none",i),children:[t.jsxs("div",{className:"text-center border-b-2 border-black pb-4 mb-6",children:[t.jsx("h1",{className:"text-2xl font-bold tracking-wide",children:"WAREHOUSE MANAGEMENT SYSTEM"}),t.jsx("p",{className:"text-sm text-gray-600 mt-1",children:"Inventory and Supply Chain Coordination"}),t.jsxs("div",{className:"mt-4",children:[t.jsx("h2",{className:"text-xl font-semibold",children:p(e.type)}),t.jsx("p",{className:"text-sm text-gray-500",children:d(e.type)})]})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-4 mb-6",children:[t.jsxs("div",{children:[t.jsx("p",{className:"text-sm text-gray-600",children:"Document No."}),t.jsx("p",{className:"font-semibold text-lg",children:e.documentNumber})]}),t.jsxs("div",{className:"text-right",children:[t.jsx("p",{className:"text-sm text-gray-600",children:"Date"}),t.jsx("p",{className:"font-semibold",children:l(e.documentDate)})]})]}),t.jsxs("div",{className:"bg-gray-50 p-4 rounded mb-6 print:bg-gray-100",children:[t.jsx("p",{className:"text-sm text-gray-600 mb-1",children:e.partyType}),t.jsx("p",{className:"font-semibold text-lg",children:e.partyName}),(e.partyCity||e.partyCountry)&&t.jsx("p",{className:"text-sm text-gray-600",children:[e.partyCity,e.partyCountry].filter(Boolean).join(", ")}),e.partyAddress&&t.jsx("p",{className:"text-sm text-gray-600",children:e.partyAddress})]}),e.referenceNumber&&t.jsxs("div",{className:"mb-4",children:[t.jsxs("span",{className:"text-sm text-gray-600",children:[e.referenceLabel||"Reference No.",": "]}),t.jsx("span",{className:"font-medium",children:e.referenceNumber})]}),e.items&&e.items.length>0&&t.jsx("div",{className:"mb-6",children:t.jsxs("table",{className:"w-full border-collapse",children:[t.jsx("thead",{children:t.jsxs("tr",{className:"bg-gray-100 print:bg-gray-200",children:[t.jsx("th",{className:"border border-gray-300 px-3 py-2 text-left text-sm",children:"Description"}),t.jsx("th",{className:"border border-gray-300 px-3 py-2 text-right text-sm w-20",children:"Qty"}),t.jsx("th",{className:"border border-gray-300 px-3 py-2 text-right text-sm w-28",children:"Unit Price"}),t.jsx("th",{className:"border border-gray-300 px-3 py-2 text-right text-sm w-28",children:"Amount"})]})}),t.jsx("tbody",{children:e.items.map((r,o)=>t.jsxs("tr",{children:[t.jsx("td",{className:"border border-gray-300 px-3 py-2 text-sm",children:r.description}),t.jsx("td",{className:"border border-gray-300 px-3 py-2 text-right text-sm",children:r.quantity}),t.jsx("td",{className:"border border-gray-300 px-3 py-2 text-right text-sm",children:a(r.unitPrice)}),t.jsx("td",{className:"border border-gray-300 px-3 py-2 text-right text-sm",children:a(r.total)})]},o))})]})}),t.jsx("div",{className:"flex justify-end mb-6",children:t.jsxs("div",{className:"w-64",children:[e.subtotal!==void 0&&t.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-200",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Subtotal:"}),t.jsx("span",{className:"text-sm",children:a(e.subtotal)})]}),t.jsxs("div",{className:"flex justify-between py-2 border-b-2 border-black font-bold",children:[t.jsx("span",{children:"Total Amount:"}),t.jsx("span",{children:a(e.totalAmount)})]}),e.amountPaid!==void 0&&t.jsxs("div",{className:"flex justify-between py-1",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Amount Paid:"}),t.jsx("span",{className:"text-sm",children:a(e.amountPaid)})]}),e.balance!==void 0&&t.jsxs("div",{className:"flex justify-between py-1 font-semibold",children:[t.jsx("span",{children:"Balance Due:"}),t.jsx("span",{className:e.balance>0?"text-red-600":"text-green-600",children:a(e.balance)})]})]})}),e.paymentMode&&t.jsxs("div",{className:"bg-gray-50 p-3 rounded mb-4 print:bg-gray-100",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Payment Method: "}),t.jsx("span",{className:"font-medium",children:e.paymentMode})]}),e.status&&t.jsxs("div",{className:"mb-4",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Status: "}),t.jsx("span",{className:"font-medium px-2 py-1 bg-gray-200 rounded text-sm",children:e.status})]}),e.expectedDeliveryDate&&t.jsxs("div",{className:"mb-4",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Expected Delivery: "}),t.jsx("span",{className:"font-medium",children:l(e.expectedDeliveryDate)})]}),e.notes&&t.jsxs("div",{className:"border-t border-gray-200 pt-4 mb-6",children:[t.jsx("p",{className:"text-sm text-gray-600 mb-1",children:"Notes:"}),t.jsx("p",{className:"text-sm",children:e.notes})]}),e.approvedBy&&t.jsxs("div",{className:"mb-4",children:[t.jsx("span",{className:"text-sm text-gray-600",children:"Approved By: "}),t.jsx("span",{className:"font-medium",children:e.approvedBy}),e.approvedDate&&t.jsxs("span",{className:"text-sm text-gray-500 ml-2",children:["on ",l(e.approvedDate)]})]}),t.jsxs("div",{className:"grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-300",children:[t.jsxs("div",{className:"text-center",children:[t.jsx("div",{className:"border-b border-black mb-2 h-12"}),t.jsx("p",{className:"text-sm text-gray-600",children:"Prepared By"}),e.createdBy&&t.jsx("p",{className:"text-xs mt-1",children:e.createdBy})]}),t.jsxs("div",{className:"text-center",children:[t.jsx("div",{className:"border-b border-black mb-2 h-12"}),t.jsx("p",{className:"text-sm text-gray-600",children:"Received By"})]})]}),t.jsxs("div",{className:"mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500",children:[t.jsx("p",{children:"This is a computer-generated document. No signature required unless specified."}),t.jsxs("p",{className:"mt-1",children:["Printed on: ",new Date().toLocaleString("en-PH")]})]})]}));h.displayName="PrintableReceipt";function f(){return{printReceipt:c.useCallback(i=>{const s=window.open("","_blank","width=800,height=600");if(!s){alert("Please allow popups to print the receipt.");return}const r=p(i.type),o=g(i,r);s.document.write(o),s.document.close(),s.onload=()=>{s.focus(),s.print()}},[])}}function g(e,i){const s=n=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(n),r=n=>new Date(n).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}),o=e.items?.map(n=>`
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px;">${n.description}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${n.quantity}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${s(n.unitPrice)}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${s(n.total)}</td>
    </tr>
  `).join("")||"";return`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${i} - ${e.documentNumber}</title>
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
        <h2>${i}</h2>
        <p>${d(e.type)}</p>
      </div>

      <div class="info-row">
        <div>
          <p style="font-size: 12px; color: #666;">Document No.</p>
          <p style="font-size: 18px; font-weight: bold;">${e.documentNumber}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; color: #666;">Date</p>
          <p style="font-weight: bold;">${r(e.documentDate)}</p>
        </div>
      </div>

      <div class="party-box">
        <p class="label">${e.partyType}</p>
        <p class="name">${e.partyName}</p>
        ${e.partyCity||e.partyCountry?`<p style="font-size: 12px; color: #666;">${[e.partyCity,e.partyCountry].filter(Boolean).join(", ")}</p>`:""}
      </div>

      ${e.referenceNumber?`
        <p style="margin-bottom: 15px;">
          <span style="color: #666;">${e.referenceLabel||"Reference No."}: </span>
          <strong>${e.referenceNumber}</strong>
        </p>
      `:""}

      ${e.items&&e.items.length>0?`
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
            ${o}
          </tbody>
        </table>
      `:""}

      <div class="totals">
        <div class="row total-row">
          <span class="label">Total Amount:</span>
          <span class="value">${s(e.totalAmount)}</span>
        </div>
        ${e.amountPaid!==void 0?`
          <div class="row">
            <span class="label">Amount Paid:</span>
            <span class="value">${s(e.amountPaid)}</span>
          </div>
        `:""}
        ${e.balance!==void 0?`
          <div class="row" style="font-weight: bold;">
            <span class="label">Balance Due:</span>
            <span class="value" style="color: ${e.balance>0?"#c00":"#0a0"}">${s(e.balance)}</span>
          </div>
        `:""}
      </div>

      ${e.paymentMode?`
        <div style="background: #f5f5f5; padding: 10px; margin: 15px 0;">
          <span style="color: #666;">Payment Method: </span>
          <strong>${e.paymentMode}</strong>
        </div>
      `:""}

      ${e.status?`
        <p style="margin: 10px 0;">
          <span style="color: #666;">Status: </span>
          <span style="background: #e0e0e0; padding: 3px 8px; border-radius: 3px;">${e.status}</span>
        </p>
      `:""}

      ${e.expectedDeliveryDate?`
        <p style="margin: 10px 0;">
          <span style="color: #666;">Expected Delivery: </span>
          <strong>${r(e.expectedDeliveryDate)}</strong>
        </p>
      `:""}

      ${e.notes?`
        <div class="notes">
          <p style="font-size: 12px; color: #666; margin-bottom: 5px;">Notes:</p>
          <p>${e.notes}</p>
        </div>
      `:""}

      ${e.approvedBy?`
        <p style="margin: 10px 0;">
          <span style="color: #666;">Approved By: </span>
          <strong>${e.approvedBy}</strong>
          ${e.approvedDate?`<span style="color: #666; margin-left: 10px;">on ${r(e.approvedDate)}</span>`:""}
        </p>
      `:""}

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p style="font-size: 12px; color: #666;">Prepared By</p>
          ${e.createdBy?`<p style="font-size: 10px;">${e.createdBy}</p>`:""}
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
  `}export{u as D,f as u};
