
import React from 'react';
import { RentRecord } from '../types';

interface ReceiptProps {
  record: RentRecord;
}

export const Receipt: React.FC<ReceiptProps> = ({ record }) => {
  return (
    <div className="bg-white p-8 max-w-2xl mx-auto border-2 border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:m-0 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider">Rent Receipt</h1>
          <p className="text-sm text-slate-500 mt-1">AIT SOLUTION Management</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-700">Receipt No: <span className="text-indigo-600">#{record.receiptNumber}</span></p>
          <p className="text-sm text-slate-500">Date: {new Date(record.paymentDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-6">
        <p className="text-lg leading-relaxed text-slate-700">
          Received with thanks from <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 px-2">{record.tenantName}</span>, 
          the sum of <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 px-2">৳{record.rentAmount.toLocaleString()}</span> 
          being payment for rent of <span className="font-semibold">Flat No: {record.flatNumber}</span> 
          for the month of <span className="font-semibold">{record.rentMonth}</span>.
        </p>

        <div className="grid grid-cols-2 gap-8 mt-12 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold">Tenant Contact</p>
              <p className="font-medium text-slate-800">{record.mobileNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold">Payment Method</p>
              <p className="font-bold text-indigo-700">{record.paymentMethod}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {record.paymentMethod === 'Bank' && (
              <>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold">Bank Name</p>
                  <p className="font-medium text-slate-800">{record.bankName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 font-bold">Account / Branch</p>
                  <p className="font-medium text-slate-800">{record.accountNumber} ({record.branch})</p>
                </div>
              </>
            )}
            {record.paymentMethod === 'MFS' && (
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">MFS Number</p>
                <p className="font-medium text-slate-800">{record.mfsNumber}</p>
              </div>
            )}
            {record.paymentMethod === 'Cash' && (
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">Status</p>
                <p className="font-medium text-green-600">Paid in Full (Cash)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Signature */}
      <div className="mt-20 flex justify-between items-end">
        <div className="border-t-2 border-slate-200 pt-2 w-48 text-center">
          <p className="text-xs text-slate-400 uppercase font-bold">Verified By</p>
          <p className="text-sm text-slate-600 mt-1">AIT SOLUTION System</p>
        </div>
        <div className="border-t-2 border-slate-900 pt-2 w-48 text-center">
          <div className="h-12 flex items-center justify-center italic text-slate-300 font-serif">
            Digital Signature
          </div>
          <p className="text-xs text-slate-900 uppercase font-bold">Landlord Signature</p>
        </div>
      </div>

      <div className="mt-12 text-center text-[10px] text-slate-400 print:block hidden">
        This is a computer-generated receipt. No physical signature is required unless requested.
      </div>
    </div>
  );
};
