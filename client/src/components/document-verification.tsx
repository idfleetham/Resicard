import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

const documentTypes = [
  { value: "driving_license", label: "Driving License" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "passport", label: "Passport" },
  { value: "council_tax", label: "Council Tax Statement" },
];

export default function DocumentVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const resizeDocument = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Handle PDF files differently
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Limit PDF size to 500KB base64
          if (result.length > 500000) {
            reject(new Error('PDF file is too large. Please ensure it\'s under 2MB.'));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file'));
        reader.readAsDataURL(file);
        return;
      }

      // Handle image files
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        try {
          // More aggressive resizing for smaller files
          const maxWidth = 600;
          const maxHeight = 600;
          const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
          const width = img.width * ratio;
          const height = img.height * ratio;
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use lower quality for smaller file size
          const result = canvas.toDataURL('image/jpeg', 0.6);
          
          // Check if result is still too large
          if (result.length > 400000) { // ~300KB limit
            reject(new Error('Image file is too large even after compression. Please use a smaller image.'));
            return;
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to process image file'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      
      try {
        const resizedDocument = await resizeDocument(file);
        setDocumentFile(resizedDocument);
        toast({
          title: "File Uploaded",
          description: `${file.name} has been processed and is ready for submission.`,
        });
      } catch (error: any) {
        toast({
          title: "File Processing Failed",
          description: error.message,
          variant: "destructive",
        });
        setFileName("");
        setDocumentFile(null);
      }
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleSubmit = async () => {
    if (!selectedDocumentType || !documentFile) {
      toast({
        title: "Missing Information",
        description: "Please select a document type and upload a file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      console.log("Starting document submission:", {
        documentType: selectedDocumentType,
        documentFileLength: documentFile?.length || 0,
        hasFile: !!documentFile
      });
      
      const response = await apiRequestWithAuth("POST", "/api/documents/submit", {
        documentType: selectedDocumentType,
        documentFile: documentFile,
      });
      
      console.log("Document submission successful:", response.status);
      
      // Invalidate auth cache to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Document Submitted",
        description: "Your document has been submitted for verification. You'll be notified once it's reviewed.",
      });
      
      // Reset form
      setSelectedDocumentType("");
      setDocumentFile(null);
      setFileName("");
    } catch (error: any) {
      console.error("Document submission failed:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = () => {
    if (!user?.documentStatus) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Not Submitted
        </Badge>
      );
    }

    switch (user.documentStatus) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const canSubmitNewDocument = !user?.documentStatus || user.documentStatus === "rejected";
  const isVerified = user?.isResidencyVerified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Residency Verification</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVerified ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800">Residency Verified</h3>
            <p className="text-sm text-gray-600 mt-2">
              Your residency has been verified. You can now use vouchers for redemption.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Verification Required</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    To use vouchers for redemption, please upload a document proving your St Andrews residency.
                    Your membership card and vouchers cannot be used until verification is complete.
                  </p>
                </div>
              </div>
            </div>

            {user?.documentStatus === "pending" ? (
              <div className="text-center py-6">
                <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-800">Under Review</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Your document is being reviewed by our team. We'll notify you once the verification is complete.
                </p>
                {user.documentSubmittedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Submitted on {new Date(user.documentSubmittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : canSubmitNewDocument ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Document Type</label>
                  <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Document</label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-300 hover:border-primary"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {isDragActive
                        ? "Drop the document here..."
                        : "Drag & drop a document here, or click to select"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, PDF up to 10MB. Document should clearly show your name and St Andrews address.
                    </p>
                    {fileName && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        Selected: {fileName}
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("Submit button clicked:", {
                      selectedDocumentType,
                      hasDocumentFile: !!documentFile,
                      documentFileLength: documentFile?.length
                    });
                    handleSubmit();
                  }} 
                  disabled={isUploading || !selectedDocumentType || !documentFile}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isUploading ? "Submitting..." : "Submit for Verification"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}