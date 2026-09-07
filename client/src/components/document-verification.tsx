import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, FileText, Upload, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate } from "@/components/resident/format";
import { readFileAsDataUrl, resizeImageFile } from "@/components/resident/image-resize";

const DOCUMENT_TYPES = [
  { value: "driving_licence", label: "Driving licence" },
  { value: "bank_statement", label: "Bank statement" },
  { value: "utility_bill", label: "Utility bill" },
  { value: "council_tax", label: "Council tax letter" },
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

const MAX_PDF_CHARS = 700_000; // roughly 500 KB once base64 encoded

export default function DocumentVerification() {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [file, setFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [reading, setReading] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!documentType || !file) throw new Error("Choose a document type and a file");
      await apiRequest("POST", "/api/profile/document", { documentType, documentFile: file.dataUrl });
    },
    onSuccess: async () => {
      setFile(null);
      setDocumentType("");
      await refresh();
      toast({ title: "Document sent", description: "We will check it and let you know." });
    },
    onError: (err) => toast({ title: "Upload failed", description: errorMessage(err), variant: "destructive" }),
  });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setReading(true);
    try {
      let dataUrl: string;
      if (f.type === "application/pdf") {
        dataUrl = await readFileAsDataUrl(f);
        if (dataUrl.length > MAX_PDF_CHARS) throw new Error("That PDF is too large. Please use one under 500 KB, or take a photo instead.");
      } else {
        dataUrl = await resizeImageFile(f, { maxSize: 1200, quality: 0.7 });
      }
      setFile({ name: f.name, dataUrl });
    } catch (err) {
      toast({ title: "Could not read the file", description: errorMessage(err), variant: "destructive" });
    } finally {
      setReading(false);
    }
  };

  if (!user) return null;

  if (user.isResidencyVerified) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-900">Address verified</AlertTitle>
        <AlertDescription className="text-green-800">
          Your St Andrews address was confirmed{user.documentReviewedAt ? ` on ${formatDate(user.documentReviewedAt)}` : ""}.
        </AlertDescription>
      </Alert>
    );
  }

  if (user.documentStatus === "pending") {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <Clock className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-900">Proof of address under review</AlertTitle>
        <AlertDescription className="text-amber-800">
          Sent {formatDate(user.documentSubmittedAt)}. We usually check documents within two working days.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Verify your address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.documentStatus === "rejected" && (
          <Alert variant="destructive">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Your last document was not accepted</AlertTitle>
            <AlertDescription>
              {user.documentRejectionReason || "Please upload a clearer document showing your name and St Andrews address."}
            </AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-slate-600">
          Upload one document showing your name and a St Andrews address. A photo taken on your phone is fine.
        </p>

        <div>
          <label className="text-sm font-medium text-slate-700">Document type</label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger className="h-12 mt-1 text-base">
              <SelectValue placeholder="Choose a document" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-base">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full h-14 text-base justify-start"
          disabled={reading}
          onClick={() => fileInput.current?.click()}
        >
          {file ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          <span className="truncate">{reading ? "Reading file" : file ? file.name : "Choose a photo or PDF"}</span>
        </Button>

        <Button
          className="w-full h-12 text-base"
          disabled={!documentType || !file || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? "Sending" : "Send for review"}
        </Button>
      </CardContent>
    </Card>
  );
}
