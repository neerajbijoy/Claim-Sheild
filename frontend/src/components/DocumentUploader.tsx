import React, { useState } from 'react';
import { Upload, FileText, Image, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { ClaimDocument } from '../types';

interface DocumentUploaderProps {
  documents: Partial<ClaimDocument>[];
  onUploadFile: (file: File, documentType: string) => Promise<void>;
  onRemoveDoc?: (id: string) => void;
  isUploading?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onUploadFile,
  onRemoveDoc,
  isUploading = false
}) => {
  const [selectedType, setSelectedType] = useState<string>('Clinical Notes');
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = [
    'Clinical Notes',
    'Treatment Plan',
    'X-Ray / Radiograph',
    'Intraoral Photo',
    'Other'
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds 15MB maximum limit.');
      return;
    }
    try {
      await onUploadFile(file, selectedType);
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Select Document Category Before Uploading
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedType(cat)}
              className={`px-3 py-2 text-xs rounded-xl font-medium border transition-all text-center ${
                selectedType === cat
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          dragOver ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 mx-auto flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {isUploading ? 'Uploading file to Supabase Storage...' : `Drop ${selectedType} here or click to browse`}
          </p>
          <p className="text-xs text-slate-500 mt-1">Supports PDF, JPEG, PNG up to 15MB</p>
        </label>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Uploaded Evidence Documents ({documents.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    {doc.document_type?.includes('X-Ray') ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-medium text-brand-600">{doc.document_type}</span>
                      {doc.file_size && <span>• {(doc.file_size / 1024 / 1024).toFixed(1)} MB</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Uploaded
                  </span>
                  {onRemoveDoc && (
                    <button
                      type="button"
                      onClick={() => onRemoveDoc(doc.id!)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
