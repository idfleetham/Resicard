import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Link, useSearch } from "wouter";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
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
import heroImage from "@assets/IMG_5180_1749763959712.jpeg";

const baseSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  surname: z.string().min(1, "Surname is required"),
});

const residentSchema = baseSchema.extend({
  role: z.literal("resident"),
  postcode: z.string().min(1, "Postcode is required")
    .refine(validatePostcode, "Postcode must be within 10 miles of St Andrews"),
  profilePhoto: z.string().min(1, "Profile photo is required"),
});

const studentSchema = baseSchema.extend({
  role: z.literal("student"),
  studentId: z.string().min(1, "Student ID is required"),
  university: z.string().min(1, "University name is required"),
  courseYear: z.string().min(1, "Course year is required"),
  profilePhoto: z.string().min(1, "Profile photo is required"),
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
type StudentFormData = z.infer<typeof studentSchema>;
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
  const [postcodeValid, setPostcodeValid] = useState(false);
  const [postcodeChecked, setPostcodeChecked] = useState(false);
  
  // Student verification state
  const [studentProfileImageUrl, setStudentProfileImageUrl] = useState<string>("");

  const residentForm = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      surname: "",
      role: "resident",
      postcode: "",
      profilePhoto: "",
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



  // Dropzone callbacks
  const onProfileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const resizedImage = await resizeProfileImage(file);
      setProfileImageUrl(resizedImage);
      residentForm.setValue('profilePhoto', resizedImage);
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
      firstName: "",
      surname: "",
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
        title: "Welcome to Resicard!",
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

  const onStudentSubmit = async (data: StudentFormData) => {
    try {
      await register(data);
      toast({
        title: "Welcome to Resicard!",
        description: "Your student account has been created successfully.",
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
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'grayscale(100%) contrast(1.1) brightness(0.3)',
          mixBlendMode: 'multiply',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70"></div>
      
      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 hover:opacity-80">
              <MapPin className="h-8 w-8 text-white" />
              <span className="text-3xl font-bold text-white">Resicard</span>
            </Link>
            <p className="text-white/90 text-lg mt-2">Join the St Andrews Community</p>
          </div>

          {/* Registration Form */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-slate-900 text-2xl">Create Your Account</CardTitle>
            </CardHeader>
            <CardBody>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 border border-slate-200 rounded-lg">
                  <TabsTrigger value="resident" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-md">
                    <Home className="h-4 w-4" />
                    <span>Resident</span>
                  </TabsTrigger>
                  <TabsTrigger value="student" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-md">
                    <User className="h-4 w-4" />
                    <span>Student</span>
                  </TabsTrigger>
                  <TabsTrigger value="merchant" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-md">
                    <Store className="h-4 w-4" />
                    <span>Business</span>
                  </TabsTrigger>
                </TabsList>

              {/* Resident Registration */}
              <TabsContent value="resident" className="space-y-4 mt-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Resident Membership:</strong> Verify your local status with a valid postcode 
                    within 10 miles of St Andrews. Annual membership fee applies.
                  </p>
                </div>

                <Form {...residentForm}>
                  <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={residentForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={residentForm.control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surname</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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

                    {/* Note about verification after registration */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800">Next Step: Document Verification</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            After creating your account, you'll need to upload a document proving your St Andrews residency 
                            from your dashboard. This verification is required before you can redeem vouchers.
                          </p>
                        </div>
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

              {/* Student Registration */}
              <TabsContent value="student" className="space-y-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-700">
                    <strong className="text-slate-900">Student Membership:</strong> Special discounts for verified students. 
                    Provide your student ID and university details for verification.
                  </p>
                </div>

                <Form {...studentForm}>
                  <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={studentForm.control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">Surname</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={studentForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={studentForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@st-andrews.ac.uk" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={studentForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-900 font-semibold">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                {...field} 
                                className="bg-white border-slate-200 text-slate-900"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
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
                        control={studentForm.control}
                        name="studentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">Student ID</FormLabel>
                            <FormControl>
                              <Input placeholder="200012345" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={studentForm.control}
                        name="university"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">University</FormLabel>
                            <FormControl>
                              <Input placeholder="University of St Andrews" {...field} className="bg-white border-slate-200 text-slate-900" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={studentForm.control}
                      name="courseYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-900 font-semibold">Course Year</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="Select your course year" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1st-year">1st Year</SelectItem>
                                <SelectItem value="2nd-year">2nd Year</SelectItem>
                                <SelectItem value="3rd-year">3rd Year</SelectItem>
                                <SelectItem value="4th-year">4th Year</SelectItem>
                                <SelectItem value="5th-year">5th Year</SelectItem>
                                <SelectItem value="masters">Masters</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
                                <SelectItem value="postgrad">Postgraduate</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Profile Photo Upload for Students */}
                    <div className="space-y-4">
                      <FormLabel className="text-slate-900 font-semibold">Profile Photo *</FormLabel>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
                        <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                        <p className="text-sm text-slate-600 mb-2">
                          Drag & drop or click to upload
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                          <strong>Required for Security:</strong> Your photo appears on your digital student membership card 
                          so merchants can verify your identity when redeeming vouchers.
                        </p>
                      </div>
                    </div>

                    {/* Note about verification after registration */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800">Next Step: Student Verification</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            After creating your account, you'll need to upload your student ID card or official enrollment letter 
                            from your dashboard. This verification is required before you can access student discounts.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Student Account'}
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
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surname</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                <SelectItem value="hotel">Hotel</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="experience">Experience</SelectItem>
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


          </CardBody>
          </Card>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-white/90">
              Already have an account?{' '}
              <Link href="/login" className="text-white hover:underline font-semibold">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
