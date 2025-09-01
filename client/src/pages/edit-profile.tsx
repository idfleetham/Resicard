import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, Save, ArrowLeft, X, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profilePhoto || "");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        
        // Calculate crop area for center square
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;
        
        ctx.drawImage(img, x, y, minDimension, minDimension, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const resizedImage = await resizeImage(file);
      setProfileImageUrl(resizedImage);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsUploading(true);
      
      const updateData = {
        ...data,
        profilePhoto: profileImageUrl === "" ? null : profileImageUrl || user?.profilePhoto,
      };

      await apiRequestWithAuth("PUT", "/api/profile", updateData);
      
      // Invalidate auth cache to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setProfileImageUrl("");
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="relative coastal-gradient text-white rounded-3xl shadow-2xl border-0 p-8 overflow-hidden">
          <div className="relative z-10 flex items-center space-x-4">
            <Link href={user.role === 'resident' ? '/resident-dashboard' : '/merchant-dashboard'}>
              <Button variant="ghost" size="sm" className="p-3 hover:bg-white/20 text-white border-white/30 rounded-2xl">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 ring-1 ring-gray-100">
          <div className="mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              <div className="p-2 bg-blue-100 rounded-xl">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              Profile Information
            </h2>
          </div>
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Photo Section */}
                <div className="space-y-4">
                  <FormLabel>Profile Photo</FormLabel>
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={profileImageUrl} alt={user.username} />
                        <AvatarFallback className="text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {profileImageUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={removePhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex-1">
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
                            ? "Drop the image here..."
                            : "Drag & drop an image here, or click to select"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF up to 5MB. Image will be automatically resized and cropped.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isUploading} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isUploading ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Digital Membership Card Preview */}
        <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 ring-1 ring-gray-100">
          <div className="mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              Digital Membership Card Preview
            </h2>
          </div>
          <div>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 border-2 border-white">
                  <AvatarImage src={profileImageUrl} alt={user.username} />
                  <AvatarFallback className="text-lg bg-white text-gray-800">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">Resicard</h3>
                  <p className="text-sm opacity-90">St Andrews Community</p>
                  <p className="text-lg font-semibold mt-1">{user.username}</p>
                  <p className="text-sm opacity-90">
                    Member since {new Date(user.createdAt).getFullYear()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Add to Apple Wallet Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                className="bg-black hover:bg-gray-800 text-white rounded-2xl px-8 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => window.location.href = '/wallet/add'}
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Add to Apple Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}