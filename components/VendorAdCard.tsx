import React from 'react';
import { Vendor } from '../types';
import { MapPin, ExternalLink, CheckCircle } from 'lucide-react';

interface VendorAdCardProps {
  vendor: Vendor;
}

export const VendorAdCard: React.FC<VendorAdCardProps> = ({ vendor }) => {
  return (
    <div className="relative group rounded-2xl overflow-hidden bg-white shadow-sm border border-indigo-100 hover:shadow-md transition-all cursor-pointer flex flex-col break-inside-avoid mb-4">
      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider z-10">
        Featured {vendor.category}
      </div>
      
      {vendor.coverImage ? (
        <div className="h-48 w-full overflow-hidden">
          <img 
            src={vendor.coverImage} 
            alt={vendor.businessName} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
           <span className="font-bold text-2xl opacity-50">{vendor.businessName.charAt(0)}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-lg leading-tight">
                {vendor.businessName}
                {vendor.isVerified && <CheckCircle size={14} className="inline ml-1 text-blue-500" />}
            </h3>
        </div>
        
        <p className="text-slate-500 text-xs mb-3 flex items-center">
            <MapPin size={12} className="mr-1" /> {vendor.city}
        </p>
        
        <p className="text-slate-600 text-sm line-clamp-2 mb-4">
            {vendor.description}
        </p>

        <a 
            href={vendor.website || `mailto:${vendor.contactEmail}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center transition-colors border border-slate-200"
        >
            Contact <ExternalLink size={14} className="ml-2" />
        </a>
      </div>
    </div>
  );
};