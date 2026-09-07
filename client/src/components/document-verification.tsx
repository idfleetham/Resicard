import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, FileText, Upload, XCircle } from "lucide-react";
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
      <div className="bg-white rounded-2xl p-5 flex gap-3">
        <Check className="h-5 w-5 flex-none text-[#1F8A5B]" strokeWidth={2.5} />
        <div>
          <p className="font-bold text-[#1F8A5B]">Address verified</p>
          <p className="text-sm text-slate-brand mt-1">
            Your St Andrews address was confirmed{user.documentReviewedAt ? ` on ${formatDate(user.documentReviewedAt)}` : ""}.
          </p>
        </div>
      </div>
    );
  }

  if (user.documentStatus === "pending") {
    return (
      <div className="bg-sand rounded-2xl p-5 flex gap-3 text-sea">
        <Clock className="h-5 w-5 flex-none" />
        <div>
          <p className="font-bold">Proof of address under review</p>
          <p className="text-sm mt-1">
            Sent {formatDate(user.documentSubmittedAt)}. We usually check documents within two working days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-5 text-sea flex flex-col gap-4">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Verify your address</h2>
      {user.documentStatus === "rejected" && (
        <div className="rounded-xl border border-destructive/40 p-4 flex gap-3 text-destructive">
          <XCircle className="h-5 w-5 flex-none" />
          <div>
            <p className="font-bold">Your last document was not accepted</p>
            <p className="text-sm mt-1">
              {user.documentRejectionReason || "Please upload a clearer document showing your name and St Andrews address."}
            </p>
          </div>
        </div>
      )}
      <p className="text-sm text-slate-brand">
        Upload one document showing your name and a St Andrews address. A photo taken on your phone is fine.
      </p>

      <div>
        <label className="text-sm font-semibold">Document type</label>
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
          <SelectTrigger className="h-12 mt-1 rounded-xl text-base">
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
        className="w-full h-12 text-base justify-start rounded-xl"
        disabled={reading}
        onClick={() => fileInput.current?.click()}
      >
        {file ? <FileText className="!h-5 !w-5" /> : <Upload className="!h-5 !w-5" />}
        <span className="truncate">{reading ? "Reading file" : file ? file.name : "Choose a photo or PDF"}</span>
      </Button>

      <Button
        className="w-full h-12 text-base"
        disabled={!documentType || !file || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? "Sending" : "Send for review"}
      </Button>
    </section>
  );
}
