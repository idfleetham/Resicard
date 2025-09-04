import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Globe, 
  Clock, 
  Key, 
  Upload, 
  Copy, 
  RefreshCw,
  Save,
  Camera,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  DollarSign,
  ArrowUp,
  ArrowRight
} from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";

const businessDetailsSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  description: z.string().optional(),
});

const businessHoursSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
});

const reservationSchema = z.object({
  provider: z.enum(["none", "opentable", "resy", "bookatable", "tock", "sevenrooms", "custom"]),
  url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type BusinessDetailsData = z.infer<typeof businessDetailsSchema>;
type BusinessHoursData = z.infer<typeof businessHoursSchema>;
type ReservationData = z.infer<typeof reservationSchema>;

export default function MerchantSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("business");
  const [apiKey] = useState("sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Initialize logo preview with user's existing profile photo
  useEffect(() => {
    if (user?.profilePhoto) {
      setLogoPreview(user.profilePhoto);
    }
  }, [user?.profilePhoto]);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [showCropper, setShowCropper] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'square' | 'landscape' | 'portrait'>('square');
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Aspect ratio configurations
  const aspectRatios = {
    square: { ratio: 1, label: 'Square (1:1)' },
    landscape: { ratio: 16/9, label: 'Landscape (16:9)' },
    portrait: { ratio: 9/16, label: 'Portrait (9:16)' }
  };
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Load Google Maps JavaScript API
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places']
        });
        await loader.load();
        setIsGoogleMapsLoaded(true);
      } catch (error) {
        console.log('Google Maps API not available - using basic input');
      }
    };

    loadGoogleMaps();
  }, []);

  const businessForm = useForm<BusinessDetailsData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      name: user?.businessName || "",
      email: user?.email || "",
      phone: user?.businessPhone || "",
      address: user?.businessAddress || "",
      description: "",
    },
  });

  const hoursForm = useForm<BusinessHoursData>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 8:00 PM",
      saturday: "10:00 AM - 6:00 PM",
      sunday: "Closed",
    },
  });

  const reservationForm = useForm<ReservationData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      provider: "none",
      url: "",
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: (data: BusinessDetailsData) =>
      apiRequest("PUT", "/api/merchant", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant", "me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReservationMutation = useMutation({
    mutationFn: (data: ReservationData) =>
      apiRequest("PUT", "/api/merchant/reservation", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant", "me"] });
      toast({ title: "Reservation settings saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving reservation settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token"); // Fixed: use correct token key
      return fetch("/api/merchant/upload/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }).then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Upload failed: ${res.status} ${errorText}`);
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["merchant", "me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Logo uploaded successfully" });
      setLogoPreview(data.profilePhoto);
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: (data: BusinessHoursData) =>
      apiRequest("PUT", `/api/merchants/${user!.id}/hours`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", user!.id] });
      toast({ title: "Business hours updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating business hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/merchants/${user!.id}/regenerate-api-key`),
    onSuccess: () => {
      toast({ title: "API key regenerated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error regenerating API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onBusinessSubmit = (data: BusinessDetailsData) => {
    updateBusinessMutation.mutate(data);
  };

  const onHoursSubmit = (data: BusinessHoursData) => {
    updateHoursMutation.mutate(data);
  };

  const selectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropper(true);
        // Reset to square by default when new image is selected
        setSelectedAspectRatio('square');
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    updateCropForAspectRatio(width, height);
  }, [selectedAspectRatio]);

  const updateCropForAspectRatio = (imageWidth: number, imageHeight: number) => {
    const aspectRatio = aspectRatios[selectedAspectRatio].ratio;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        imageWidth,
        imageHeight
      ),
      imageWidth,
      imageHeight
    );
    setCrop(crop);
  };

  // Update crop when aspect ratio changes
  const handleAspectRatioChange = (newRatio: 'square' | 'landscape' | 'portrait') => {
    setSelectedAspectRatio(newRatio);
    if (imgRef.current) {
      updateCropForAspectRatio(imgRef.current.width, imgRef.current.height);
    }
  };

  const getCroppedImg = useCallback(() => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use natural dimensions for proper scaling
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate actual crop dimensions in source image pixels
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Set canvas size to desired output dimensions (fixed size for better quality)
    const outputSize = 400; // High quality output
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Clear canvas and set high quality rendering
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the cropped portion directly to the canvas
    ctx.drawImage(
      image,
      cropX,        // Source x
      cropY,        // Source y  
      cropWidth,    // Source width
      cropHeight,   // Source height
      0,           // Destination x
      0,           // Destination y
      outputSize,  // Destination width
      outputSize   // Destination height
    );

    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'logo.png', { type: 'image/png' });
          resolve(file);
        }
      }, 'image/png', 0.95);
    });
  }, [completedCrop]);

  const handleCropComplete = async () => {
    try {
      const croppedFile = await getCroppedImg();
      if (croppedFile) {
        uploadLogoMutation.mutate(croppedFile);
        setShowCropper(false);
        setImgSrc('');
      }
    } catch (error) {
      toast({
        title: "Error processing image",
        description: "Failed to crop the image",
        variant: "destructive",
      });
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({ title: "API key copied to clipboard" });
  };

  const regenerateApiKey = () => {
    if (confirm("Are you sure you want to regenerate your API key? This will invalidate the current key.")) {
      regenerateApiKeyMutation.mutate();
    }
  };

  // Address Autocomplete Component  
  const AddressAutocomplete = ({ field }: { field: any }) => {
    const [inputValue, setInputValue] = useState(field.value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Sync with form field value
    useEffect(() => {
      setInputValue(field.value || '');
    }, [field.value]);

    // Simple address suggestions for UK (fallback when Google Maps isn't available)
    const getUKAddressSuggestions = (input: string) => {
      if (input.length < 2) return [];
      
      const ukSuggestions = [
        "Market Street, St Andrews, KY16 9AB",
        "South Street, St Andrews, KY16 9QE", 
        "North Street, St Andrews, KY16 9AJ",
        "Bell Street, St Andrews, KY16 9UR",
        "Church Square, St Andrews, KY16 9NJ",
        "Abbey Street, St Andrews, KY16 9LA",
        "Castle Street, St Andrews, KY16 9AS",
        "Golf Place, St Andrews, KY16 9JA",
        "The Scores, St Andrews, KY16 9AR",
        "Gregory Place, St Andrews, KY16 9SX"
      ].filter(addr => addr.toLowerCase().includes(input.toLowerCase()));
      
      return ukSuggestions.map((addr, idx) => ({
        place_id: `uk_${idx}`,
        description: addr,
        structured_formatting: {
          main_text: addr.split(',')[0],
          secondary_text: addr.split(',').slice(1).join(',').trim()
        }
      }));
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInputValue(value);
      field.onChange(value);
      
      if (value.length >= 2) {
        const ukSuggestions = getUKAddressSuggestions(value);
        setSuggestions(ukSuggestions);
        setShowSuggestions(ukSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const handleSelect = (description: string) => {
      setInputValue(description);
      field.onChange(description);
      setShowSuggestions(false);
    };

    return (
      <div className="relative">
        <Textarea 
          className="input-dark min-h-[80px] resize-none" 
          placeholder="123 Market Street, St Andrews, KY16 9AB"
          value={inputValue}
          onChange={handleInput}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => {
            if (inputValue.length >= 2) {
              const ukSuggestions = getUKAddressSuggestions(inputValue);
              setSuggestions(ukSuggestions);
              setShowSuggestions(ukSuggestions.length > 0);
            }
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
                onClick={() => handleSelect(suggestion.description)}
              >
                <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                <div className="text-base text-slate-300">{suggestion.structured_formatting.secondary_text}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handle loading and authentication states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="h-96 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-card border border-white/40 shadow-xl shadow-white/20 p-8 text-center">
          <CardBody>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Authentication Required</h3>
            <p className="text-slate-300 mb-4">Please log in to access merchant settings.</p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Go to Login
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (user.role !== 'merchant') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-card border border-white/40 shadow-xl shadow-white/20 p-8 text-center">
          <CardBody>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Access Denied</h3>
            <p className="text-slate-300 mb-4">This page is only accessible to merchant accounts.</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Go to Home
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Hero Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Business Settings</h1>
            <p className="text-slate-300 text-lg">Manage your business profile and account details</p>
          </div>
        </div>
      </div>

      <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-fg">Settings</CardTitle>
              <CardDescription className="text-slate-300 text-lg">
                Manage your merchant account settings and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
            <CardBody className="p-4">
              <nav className="space-y-2">
                <Button
                  variant={activeTab === "business" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "business" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("business")}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  <span className="text-lg">Business Details</span>
                </Button>
                <Button
                  variant={activeTab === "hours" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "hours" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("hours")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="text-lg">Business Hours</span>
                </Button>
                <Button
                  variant={activeTab === "logo" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "logo" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("logo")}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  <span className="text-lg">Logo & Branding</span>
                </Button>
                <Button
                  variant={activeTab === "reservations" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "reservations" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("reservations")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-lg">Reservations</span>
                </Button>
                <Button
                  variant={activeTab === "tier-pricing" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "tier-pricing" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("tier-pricing")}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-lg">Tier Pricing</span>
                </Button>
                <Button
                  variant={activeTab === "tier-upgrades" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "tier-upgrades" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("tier-upgrades")}
                >
                  <ArrowUp className="w-4 h-4 mr-2" />
                  <span className="text-lg">Tier Upgrades</span>
                </Button>
                <Button
                  variant={activeTab === "api" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "api" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("api")}
                >
                  <Key className="w-4 h-4 mr-2" />
                  <span className="text-lg">API Access</span>
                </Button>
              </nav>
            </CardBody>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          {activeTab === "business" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span>Business Details</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-lg">
                    Update your business information and contact details
                  </CardDescription>
                </CardHeader>
                <CardBody>
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-4">
                    <FormField
                      control={businessForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Business Name" {...field} className="input-dark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={businessForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Email Address</FormLabel>
                            <FormControl>
                              <Input className="input-dark" type="email" placeholder="business@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={businessForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Phone Number</FormLabel>
                            <FormControl>
                              <Input className="input-dark" type="tel" placeholder="+44 1334 123456" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={businessForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Business Address</FormLabel>
                          <FormControl>
                            <AddressAutocomplete field={field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={businessForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Business Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="input-dark min-h-[80px] resize-none"
                              placeholder="Tell customers about your business..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateBusinessMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      {updateBusinessMutation.isPending ? (
                        <>
                          <Save className="w-4 h-4 mr-2 animate-pulse" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardBody>
            </Card>
            </motion.div>
          )}





          {activeTab === "api" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>API Access</span>
                </CardTitle>
                <CardDescription>
                  Manage your API key for integrations and third-party access
                </CardDescription>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">API Key</h4>
                  <div className="flex items-center space-x-2">
                    <Input 
                      readOnly
                      type="password"
                      value={apiKey}
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={copyApiKey}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={regenerateApiKey} disabled={regenerateApiKeyMutation.isPending}>
                      {regenerateApiKeyMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Keep your API key secret. It provides full access to your merchant account.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">API Documentation</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">Available Endpoints</h5>
                    <ul className="space-y-1 text-base text-gray-600">
                      <li><code className="bg-white px-2 py-1 rounded">GET /api/offers</code> - List your offers</li>
                      <li><code className="bg-white px-2 py-1 rounded">POST /api/offers</code> - Create new offer</li>
                      <li><code className="bg-white px-2 py-1 rounded">GET /api/redemptions</code> - List redemptions</li>
                      <li><code className="bg-white px-2 py-1 rounded">POST /api/redemptions/redeem</code> - Process redemption</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Integration Status</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">No Active Integrations</Badge>
                  </div>
                  <p className="text-base text-gray-600">
                    Connect third-party applications using your API key to automate offer management and redemption processing.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === "hours" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span>Business Hours</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Set your operating hours for customer reference
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <Form {...hoursForm}>
                    <form onSubmit={hoursForm.handleSubmit(onHoursSubmit)} className="space-y-6">
                      {Object.entries(hoursForm.getValues()).map(([day, hours]) => {
                        const isClosed = hours === "Closed";
                        return (
                          <FormField
                            key={day}
                            control={hoursForm.control}
                            name={day as keyof BusinessHoursData}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between mb-3">
                                  <FormLabel className="capitalize text-slate-200 text-lg font-medium">{day}</FormLabel>
                                  <div className="flex items-center space-x-3">
                                    <span className="text-base text-slate-300">Closed</span>
                                    <Switch
                                      checked={!isClosed}
                                      onCheckedChange={(checked) => {
                                        field.onChange(checked ? "9:00 AM - 6:00 PM" : "Closed");
                                      }}
                                      className="data-[state=checked]:bg-green-600"
                                    />
                                    <span className="text-base text-slate-300">Open</span>
                                  </div>
                                </div>
                                {!isClosed && (
                                  <FormControl>
                                    <div className="grid grid-cols-3 gap-3 items-center">
                                      <Select
                                        value={field.value.split(" - ")[0] || "9:00 AM"}
                                        onValueChange={(value) => {
                                          const endTime = field.value.split(" - ")[1] || "6:00 PM";
                                          field.onChange(`${value} - ${endTime}`);
                                        }}
                                      >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                          <SelectValue placeholder="Start time" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                          {[
                                            "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
                                            "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
                                          ].map((time) => (
                                            <SelectItem key={time} value={time} className="text-slate-100">
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <span className="text-center text-slate-300 font-medium">to</span>
                                      <Select
                                        value={field.value.split(" - ")[1] || "6:00 PM"}
                                        onValueChange={(value) => {
                                          const startTime = field.value.split(" - ")[0] || "9:00 AM";
                                          field.onChange(`${startTime} - ${value}`);
                                        }}
                                      >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                          <SelectValue placeholder="End time" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                          {[
                                            "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
                                            "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM",
                                            "10:00 PM", "11:00 PM", "12:00 AM"
                                          ].map((time) => (
                                            <SelectItem key={time} value={time} className="text-slate-100">
                                              {time}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                      <Button 
                        type="submit" 
                        disabled={updateHoursMutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                      >
                        {updateHoursMutation.isPending ? "Saving..." : "Save Hours"}
                      </Button>
                    </form>
                  </Form>
                </CardBody>
              </Card>
            </motion.div>
          )}

          {activeTab === "logo" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Camera className="w-5 h-5 text-purple-400" />
                    <span>Logo & Branding</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Upload your business logo and customize branding
                  </CardDescription>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">Business Logo</h4>
                    {logoPreview ? (
                      <div className="space-y-4">
                        <div className="relative w-full max-w-md mx-auto">
                          <img 
                            src={logoPreview} 
                            alt="Business logo" 
                            className="w-full h-auto object-contain rounded-lg border border-slate-600"
                          />
                        </div>
                        <div className="flex justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={selectFile}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-md cursor-pointer transition-all duration-200"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Change Logo
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={selectFile}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Camera className="w-12 h-12 mb-4 text-slate-400" />
                            <p className="mb-2 text-base text-slate-300">
                              <span className="font-semibold">Click to upload</span> your business logo
                            </p>
                            <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB</p>
                          </div>
                        </label>
                        {uploadLogoMutation.isPending && (
                          <div className="flex items-center justify-center text-base text-blue-400">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Uploading logo...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}

          {/* Image Cropper Modal */}
          {showCropper && imgSrc && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto border border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Crop Your Logo</h3>
                
                {/* Aspect Ratio Selector */}
                <div className="mb-4">
                  <label className="text-base font-medium text-slate-200 mb-2 block">Logo Format</label>
                  <div className="flex gap-2">
                    {Object.entries(aspectRatios).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={selectedAspectRatio === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAspectRatioChange(key as 'square' | 'landscape' | 'portrait')}
                        className={`
                          ${selectedAspectRatio === key 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0' 
                            : 'border-slate-600 text-black bg-white hover:bg-gray-100'
                          }
                        `}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>


                <div className="space-y-4">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspectRatios[selectedAspectRatio].ratio}
                    className="max-w-full"
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={imgSrc}
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[60vh]"
                    />
                  </ReactCrop>
                  
                  {/* Hidden canvas for cropping */}
                  <canvas
                    ref={previewCanvasRef}
                    className="hidden"
                  />
                  
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCropper(false);
                        setImgSrc('');
                      }}
                      className="bg-red-100 text-black border-red-300 hover:bg-red-200"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCropComplete}
                      disabled={!completedCrop || uploadLogoMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      {uploadLogoMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reservations" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <span>Reservation System</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Connect your reservation system to display a "Book a Table" button
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <Form {...reservationForm}>
                    <form onSubmit={reservationForm.handleSubmit((data) => updateReservationMutation.mutate(data))} className="space-y-6">
                      <FormField
                        control={reservationForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Reservation Provider</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue placeholder="Select your reservation system" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="none">No reservation system</SelectItem>
                                <SelectItem value="opentable">OpenTable</SelectItem>
                                <SelectItem value="resy">Resy</SelectItem>
                                <SelectItem value="bookatable">Bookatable (Michelin)</SelectItem>
                                <SelectItem value="tock">Tock</SelectItem>
                                <SelectItem value="sevenrooms">SevenRooms</SelectItem>
                                <SelectItem value="custom">Custom/Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {reservationForm.watch("provider") !== "none" && (
                        <FormField
                          control={reservationForm.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Reservation URL</FormLabel>
                              <FormControl>
                                <Input 
                                  className="input-dark" 
                                  type="url" 
                                  placeholder="https://www.opentable.co.uk/..." 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                              <p className="text-base text-slate-300">
                                This link will be shown to customers as a "Book a Table" button
                              </p>
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex items-center justify-between pt-4">
                        <Button
                          type="submit"
                          disabled={updateReservationMutation.isPending}
                          className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white border-0"
                        >
                          {updateReservationMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Settings
                            </>
                          )}
                        </Button>

                        {reservationForm.watch("provider") !== "none" && reservationForm.watch("url") && (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-700 hover:bg-slate-800 text-slate-300"
                            onClick={() => window.open(reservationForm.getValues("url"), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Test Link
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>

                  {reservationForm.watch("provider") !== "none" && (
                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <h4 className="font-medium text-slate-200 mb-2">How it works</h4>
                      <ul className="text-base text-slate-300 space-y-1">
                        <li>• A "Book a Table" button will appear on your business profile</li>
                        <li>• Customers can click to visit your reservation system</li>
                        <li>• Works with all major reservation platforms</li>
                        <li>• You can update the link anytime</li>
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          )}

          {activeTab === "tier-pricing" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span>Tier Pricing & Memberships</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-lg">
                    Set pricing for tier memberships and manage tier benefits for your customers
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-100 mb-4">Available Loyalty Tiers</h3>
                      
                      {/* Bronze Tier */}
                      <div className="space-y-4">
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#cd7f32'}}></div>
                              <h4 className="text-lg font-semibold text-slate-100">Bronze Tier</h4>
                              <Badge variant="secondary" className="text-xs">0+ points</Badge>
                            </div>
                            <Switch className="data-[state=checked]:bg-green-500" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Annual Price (£)</label>
                              <Input placeholder="0.00" className="input-dark" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Benefits Description</label>
                              <Input placeholder="Entry level benefits" className="input-dark" />
                            </div>
                          </div>
                        </div>

                        {/* Silver Tier */}
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#c0c0c0'}}></div>
                              <h4 className="text-lg font-semibold text-slate-100">Silver Tier</h4>
                              <Badge variant="secondary" className="text-xs">100+ points • 5% discount</Badge>
                            </div>
                            <Switch className="data-[state=checked]:bg-green-500" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Annual Price (£)</label>
                              <Input placeholder="25.00" className="input-dark" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Benefits Description</label>
                              <Input placeholder="5% discount + priority access" className="input-dark" />
                            </div>
                          </div>
                        </div>

                        {/* Gold Tier */}
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ffd700'}}></div>
                              <h4 className="text-lg font-semibold text-slate-100">Gold Tier</h4>
                              <Badge variant="secondary" className="text-xs">250+ points • 10% discount</Badge>
                            </div>
                            <Switch className="data-[state=checked]:bg-green-500" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Annual Price (£)</label>
                              <Input placeholder="50.00" className="input-dark" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Benefits Description</label>
                              <Input placeholder="10% discount + exclusive offers" className="input-dark" />
                            </div>
                          </div>
                        </div>

                        {/* Platinum Tier */}
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#e5e4e2'}}></div>
                              <h4 className="text-lg font-semibold text-slate-100">Platinum Tier</h4>
                              <Badge variant="secondary" className="text-xs">500+ points • 15% discount</Badge>
                            </div>
                            <Switch className="data-[state=checked]:bg-green-500" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Annual Price (£)</label>
                              <Input placeholder="100.00" className="input-dark" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Benefits Description</label>
                              <Input placeholder="15% discount + VIP access" className="input-dark" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                      <Save className="w-4 h-4 mr-2" />
                      Save Tier Pricing
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}

          {activeTab === "tier-upgrades" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <ArrowUp className="w-5 h-5 text-green-400" />
                    <span>Tier Upgrade Pricing</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-lg">
                    Set prices for customers to upgrade directly from one tier to another
                  </CardDescription>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
                      <h3 className="text-lg font-semibold text-slate-100 mb-2">How Tier Upgrades Work</h3>
                      <p className="text-slate-300 mb-4">
                        Customers can pay to upgrade directly from their current tier to a higher tier, 
                        bypassing the points requirement. This provides immediate access to better benefits.
                      </p>
                      <div className="flex items-center space-x-2 text-blue-400">
                        <span>Example: Bronze → Gold = £25 upgrade</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-slate-100">Available Upgrade Paths</h3>
                      
                      {/* Bronze → Silver */}
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#cd7f32'}}></div>
                              <span className="text-slate-200">Bronze</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#c0c0c0'}}></div>
                              <span className="text-slate-200">Silver</span>
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-green-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Upgrade Price (£)</label>
                            <Input placeholder="15.00" className="input-dark" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration Extension</label>
                            <Select>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="12 months" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="12">12 months</SelectItem>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="3">3 months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Bronze → Gold */}
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#cd7f32'}}></div>
                              <span className="text-slate-200">Bronze</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ffd700'}}></div>
                              <span className="text-slate-200">Gold</span>
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-green-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Upgrade Price (£)</label>
                            <Input placeholder="35.00" className="input-dark" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration Extension</label>
                            <Select>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="12 months" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="12">12 months</SelectItem>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="3">3 months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Silver → Gold */}
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#c0c0c0'}}></div>
                              <span className="text-slate-200">Silver</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ffd700'}}></div>
                              <span className="text-slate-200">Gold</span>
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-green-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Upgrade Price (£)</label>
                            <Input placeholder="25.00" className="input-dark" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration Extension</label>
                            <Select>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="12 months" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="12">12 months</SelectItem>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="3">3 months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Gold → Platinum */}
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ffd700'}}></div>
                              <span className="text-slate-200">Gold</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#e5e4e2'}}></div>
                              <span className="text-slate-200">Platinum</span>
                            </div>
                          </div>
                          <Switch className="data-[state=checked]:bg-green-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Upgrade Price (£)</label>
                            <Input placeholder="50.00" className="input-dark" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Duration Extension</label>
                            <Select>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="12 months" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="12">12 months</SelectItem>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="3">3 months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                      <Save className="w-4 h-4 mr-2" />
                      Save Upgrade Pricing
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}

          {activeTab === "api" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Key className="w-5 h-5 text-yellow-400" />
                    <span>API Access</span>
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Manage API keys for third-party integrations
                  </CardDescription>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">API Key</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={apiKey}
                        readOnly
                        className="font-mono text-base bg-slate-800 border-slate-700 text-slate-300"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyApiKey}
                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateApiKey}
                        disabled={regenerateApiKeyMutation.isPending}
                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-300">
                      Keep your API key secret. It provides full access to your merchant account.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">API Documentation</h4>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <h5 className="font-medium mb-2 text-slate-200">Available Endpoints</h5>
                      <ul className="space-y-1 text-base text-slate-300">
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">GET /api/offers</code> - List your offers</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">POST /api/offers</code> - Create new offer</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">GET /api/redemptions</code> - List redemptions</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">POST /api/redemptions/redeem</code> - Process redemption</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">Integration Status</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600">No Active Integrations</Badge>
                    </div>
                    <p className="text-base text-slate-300">
                      Connect third-party applications using your API key to automate offer management and redemption processing.
                    </p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}