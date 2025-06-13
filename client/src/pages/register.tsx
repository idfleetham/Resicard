import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, EyeOff, Home, Store, Upload, FileText, User, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { validatePostcode } from "@/lib/utils";

const baseSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const residentSchema = baseSchema.extend({
  role: z.literal("resident"),
  postcode: z.string().min(1, "Postcode is required")
    .refine(validatePostcode, "Postcode must be within 10 miles of St Andrews"),
  profilePhoto: z.string().min(1, "Profile photo is required"),
  documentType: z.string().min(1, "Document type is required"),
  documentFile: z.string().min(1, "Document upload is required"),
});

const merchantSchema = baseSchema.extend({
  role: z.literal("merchant"),
  businessName: z.string().min(1, "Business name is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  businessPhone: z.string().min(1, "Business phone is required"),
});

const documentTypes = [
  { value: "driving_license", label: "Driving License" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "passport", label: "Passport" },
  { value: "council_tax", label: "Council Tax Statement" },
];

type ResidentFormData = z.infer<typeof residentSchema>;
type MerchantFormData = z.infer<typeof merchantSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearch();
  const initialRole = new URLSearchParams(searchParams).get('role') || 'resident';
  const [activeTab, setActiveTab] = useState(initialRole);
  const { register, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Resident verification state
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [documentFile, setDocumentFile] = useState<string>("");
  const [documentFileName, setDocumentFileName] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [postcodeValid, setPostcodeValid] = useState(false);
  const [postcodeChecked, setPostcodeChecked] = useState(false);

  const residentForm = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "resident",
      postcode: "",
      profilePhoto: "",
      documentType: "",
      documentFile: "",
    },
  });

  // Image resizing functions
  const resizeProfileImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;
        
        ctx.drawImage(img, x, y, minDimension, minDimension, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const resizeDocument = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 800;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Dropzone callbacks
  const onProfileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const resizedImage = await resizeProfileImage(file);
      setProfileImageUrl(resizedImage);
      residentForm.setValue('profilePhoto', resizedImage);
    }
  }, [residentForm]);

  const onDocumentDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setDocumentFileName(file.name);
      const resizedDocument = await resizeDocument(file);
      setDocumentFile(resizedDocument);
      residentForm.setValue('documentFile', resizedDocument);
    }
  }, [residentForm]);

  const { getRootProps: getProfileRootProps, getInputProps: getProfileInputProps, isDragActive: isProfileDragActive } = useDropzone({
    onDrop: onProfileDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const { getRootProps: getDocumentRootProps, getInputProps: getDocumentInputProps, isDragActive: isDocumentDragActive } = useDropzone({
    onDrop: onDocumentDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: !postcodeValid,
  });

  // Postcode validation
  const handlePostcodeChange = (value: string) => {
    setPostcodeChecked(true);
    const isValid = validatePostcode(value);
    setPostcodeValid(isValid);
    residentForm.setValue('postcode', value);
    
    if (isValid) {
      toast({
        title: "Postcode Verified",
        description: "Your postcode is within the St Andrews area. You can now upload verification documents.",
      });
    }
  };

  const merchantForm = useForm<MerchantFormData>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "merchant",
      businessName: "",
      businessCategory: "",
      businessAddress: "",
      businessPhone: "",
    },
  });

  const onResidentSubmit = async (data: ResidentFormData) => {
    try {
      await register(data);
      toast({
        title: "Welcome to LocalPerks!",
        description: "Your resident account has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const onMerchantSubmit = async (data: MerchantFormData) => {
    try {
      await register(data);
      toast({
        title: "Business Application Submitted!",
        description: "Your application is pending admin approval. You'll be notified once verified.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary hover:opacity-80">
            <MapPin className="h-8 w-8" />
            <span className="text-2xl font-bold">Resicard</span>
          </Link>
          <p className="text-muted-foreground mt-2">Join the St Andrews Community</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resident" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Local Resident</span>
                </TabsTrigger>
                <TabsTrigger value="merchant" className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span>Business Owner</span>
                </TabsTrigger>
              </TabsList>

              {/* Resident Registration */}
              <TabsContent value="resident" className="space-y-4 mt-6">
                <div className="bg-coastal-bg p-4 rounded-lg border coastal-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Resident Membership:</strong> Verify your local status with a valid postcode 
                    within 10 miles of St Andrews. Annual membership fee applies.
                  </p>
                </div>

                <Form {...residentForm}>
                  <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={residentForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={residentForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={residentForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                {...field} 
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Profile Photo Upload */}
                    <div className="space-y-4">
                      <FormLabel>Profile Photo *</FormLabel>
                      <div className="flex items-center space-x-6">
                        <div className="relative">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={profileImageUrl} alt="Profile" />
                            <AvatarFallback className="text-lg">
                              <User className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                          {profileImageUrl && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={() => {
                                setProfileImageUrl("");
                                residentForm.setValue('profilePhoto', '');
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div
                            {...getProfileRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              isProfileDragActive
                                ? "border-primary bg-primary/5"
                                : "border-gray-300 hover:border-primary"
                            }`}
                          >
                            <input {...getProfileInputProps()} />
                            <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {isProfileDragActive
                                ? "Drop photo here..."
                                : "Drag & drop or click to upload"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG up to 5MB
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                          <strong>Required for Security:</strong> Your photo appears on your digital membership card 
                          so merchants can verify your identity when redeeming vouchers.
                        </p>
                      </div>
                    </div>

                    <FormField
                      control={residentForm.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="KY16 9SS" 
                                {...field} 
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase();
                                  field.onChange(value);
                                  handlePostcodeChange(value);
                                }}
                              />
                              {postcodeChecked && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  {postcodeValid ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <X className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Must be within 10 miles of St Andrews
                            </p>
                            {postcodeChecked && postcodeValid && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Document Verification Section */}
                    <div className={`space-y-4 p-4 rounded-lg border transition-all ${
                      postcodeValid 
                        ? "border-green-200 bg-green-50" 
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-semibold">
                          Residency Verification *
                        </FormLabel>
                        {postcodeValid && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Upload Enabled
                          </Badge>
                        )}
                      </div>
                      
                      {!postcodeValid && (
                        <p className="text-sm text-amber-600">
                          Please enter a valid St Andrews postcode first to enable document upload
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={residentForm.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Document Type</FormLabel>
                              <Select 
                                value={selectedDocumentType} 
                                onValueChange={(value) => {
                                  setSelectedDocumentType(value);
                                  residentForm.setValue('documentType', value);
                                }}
                                disabled={!postcodeValid}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select document type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {documentTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <FormLabel>Upload Document</FormLabel>
                          <div
                            {...getDocumentRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              !postcodeValid 
                                ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                                : isDocumentDragActive
                                ? "border-primary bg-primary/5"
                                : "border-gray-300 hover:border-primary"
                            }`}
                          >
                            <input {...getDocumentInputProps()} />
                            <FileText className={`h-6 w-6 mx-auto mb-2 ${postcodeValid ? 'text-gray-400' : 'text-gray-300'}`} />
                            <p className={`text-sm ${postcodeValid ? 'text-gray-600' : 'text-gray-400'}`}>
                              {!postcodeValid 
                                ? "Verify postcode first"
                                : isDocumentDragActive
                                ? "Drop document here..."
                                : "Upload verification document"}
                            </p>
                            <p className={`text-xs mt-1 ${postcodeValid ? 'text-gray-500' : 'text-gray-400'}`}>
                              PNG, JPG, PDF up to 10MB
                            </p>
                            {documentFileName && (
                              <p className="text-sm text-green-600 mt-2 font-medium">
                                Selected: {documentFileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Required:</strong> Upload a document showing your name and St Andrews address 
                          (driving license, bank statement, utility bill, etc.) for residency verification.
                        </p>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full coastal-gradient"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Resident Account'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Merchant Registration */}
              <TabsContent value="merchant" className="space-y-4 mt-6">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Business Application:</strong> Your application will be reviewed by our admin team. 
                    You'll be notified once your business is verified and approved.
                  </p>
                </div>

                <Form {...merchantForm}>
                  <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={merchantForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="businessowner" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="business@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={merchantForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                {...field} 
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={merchantForm.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input placeholder="The Seafood Ristorante" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="businessCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="restaurant">Restaurant</SelectItem>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="cafe">Cafe</SelectItem>
                                <SelectItem value="pub">Pub</SelectItem>
                                <SelectItem value="takeaway">Takeaway</SelectItem>
                                <SelectItem value="fine-dining">Fine Dining</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={merchantForm.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="123 Market Street, St Andrews, KY16 9XX"
                              className="h-20"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={merchantForm.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="01334 123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-slate-600 hover:bg-slate-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Submitting Application...' : 'Submit Business Application'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
