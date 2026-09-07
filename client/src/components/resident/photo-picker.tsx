import { useRef, useState } from "react";
import { Camera, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resizeImageFile } from "@/components/resident/image-resize";
import { errorMessage } from "@/components/resident/format";

interface PhotoPickerProps {
  value?: string | null;
  onChange: (dataUrl: string) => void;
  label?: string;
}

/** Square profile photo picker; resizes to 512px on the client before upload. */
export default function PhotoPicker({ value, onChange, label = "Profile photo" }: PhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await resizeImageFile(file, { maxSize: 512, square: true }));
    } catch (err) {
      toast({ title: "Could not use that photo", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={value ?? undefined} alt="" className="object-cover" />
        <AvatarFallback className="bg-sand text-[#7A8A8F]">
          <User className="h-8 w-8" strokeWidth={1.5} />
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-semibold text-sea">{label}</p>
        <p className="text-xs text-slate-brand mb-2">Shown to staff when you redeem, so use a clear photo of your face.</p>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button type="button" variant="outline" size="sm" className="h-10" disabled={busy} onClick={() => input.current?.click()}>
          <Camera className="h-4 w-4" />
          {busy ? "Preparing" : value ? "Change photo" : "Choose photo"}
        </Button>
      </div>
    </div>
  );
}
