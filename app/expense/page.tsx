"use client";
import React, { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import axios from "axios";
import TempChat from "@/components/tempChat";
import { analysis } from "./action";
import { DataTableDemo } from "@/components/analysisTable";

const PdfUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysisResult && analysisResult.summary && autoScrollRef.current) {
      autoScrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [analysisResult]);

  const fetchData = async ({
    url,
    public_id,
  }: {
    url: string;
    public_id: string;
  }) => {
    try {
      if (!url) {
        throw new Error("URL is required for analysis.");
      }
      if (!public_id) {
        throw new Error("Public ID is required for analysis.");
      }

      // Mock analysis function - replace with your actual analysis call
      const response = await analysis({
        public_id: public_id,
        url: url,
      });

      setAnalysisResult(response);
      console.log("Analysis Result:", response);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a PDF file only.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Mock API calls - replace with your actual implementation

      const sigRes = await axios.post("http://localhost:8000/get-signature");
      const { timestamp, signature, apiKey, cloudName, folder } = sigRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const uploadRes = await axios.post(cloudinaryUrl, formData);

      // Mock successful upload
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setUploadProgress(100);

      await fetchData({
        url: uploadRes.data.secure_url,
        public_id: uploadRes.data.public_id,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  console.log();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className=" w-[90%] mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl inline-flex mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Financial Document Analyzer
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your bank statements or financial documents for AI-powered
            analysis
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="p-8">
            {/* File Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />

              <div className="space-y-4">
                {file ? (
                  <div className="flex items-center justify-center">
                    <div className="bg-green-100 p-3 rounded-full">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                )}

                {file ? (
                  <div>
                    <p className="text-lg font-semibold text-green-700">
                      File Selected
                    </p>
                    <div className="mt-3 p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-red-500" />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-800">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      Drop your PDF file here, or click to browse
                    </p>
                    <p className="text-gray-500">
                      Supports bank statements, financial reports, and expense
                      documents
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {uploadProgress < 50
                      ? "Uploading..."
                      : uploadProgress < 90
                      ? "Processing..."
                      : "Analyzing..."}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl">
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    Analyze Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div
            ref={autoScrollRef}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Analysis Complete
                  </h2>
                  <p className="text-gray-600">
                    Your document has been successfully processed
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Summary</h3>
                <p className="text-gray-700 leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                {/* <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger
                    asChild
                    > */}
                      <h3 className="font-semibold text-gray-800 mb-3">
                        Transactions
                      </h3>
                      <DataTableDemo data={analysisResult.transactions} />
                      {/* <DataTableDemo /> */}
                    {/* </AccordionTrigger>
                    <AccordionContent>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion> */}
              </div>

              {/* Chat Interface */}
              <TempChat analysisResult={analysisResult} />
            </div>
          </div>
         )} 
      </div>
    </div>
  );
};

export default PdfUploader;
