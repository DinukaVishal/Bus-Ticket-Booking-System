import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Camera, User, Mail, ShieldCheck, Loader2, Save, BadgeCheck, AlertTriangle, Crop, RotateCcw, ZoomIn, ZoomOut, Phone, MapPin, Trash2, Globe, Bell, Loader } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Helper function to centralize and make an aspect crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const Profile = () => {
  const { user, profile, isAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const initialName = profile?.displayName || user?.user_metadata?.full_name || '';
  const [displayName, setDisplayName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CROPPER STATES ---
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const aspect = 1; // 1:1 Aspect Ratio (Square/Circle)
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // --- PREFERENCES ---
  const {
    preferences,
    isLoading: isLoadingPrefs,
    isSaving: isSavingPrefs,
    updatePreferences,
  } = useUserPreferences(user?.id);

  useEffect(() => {
    setDisplayName(profile?.displayName || user?.user_metadata?.full_name || '');
    setPhoneNumber(profile?.phoneNumber || '');
    setAddress(profile?.address || '');
    setCity(profile?.city || '');
  }, [profile, user]);

  const getFallback = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  // 1. Select File & Open Modal
  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPG, PNG, or WEBP image.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    setCrop(undefined);
    setScale(1);
    setRotate(0);
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
    setIsCropModalOpen(true);
  };

  // 2. Center crop when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  // 3. Convert Canvas to Blob (High Quality)
  const getCroppedImgBlob = (image: HTMLImageElement, pixelCrop: PixelCrop, rotation: number, scale: number): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(pixelCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(pixelCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = pixelCrop.x * scaleX;
    const cropY = pixelCrop.y * scaleY;
    const rotateRads = rotation * (Math.PI / 180);
    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();
    ctx.translate(-cropX, -cropY);
    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      0, 0, image.naturalWidth, image.naturalHeight,
      0, 0, image.naturalWidth, image.naturalHeight
    );

    ctx.restore();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        1.0 // Maximum Quality
      );
    });
  };

  // 4. Handle Crop & Upload
  const handleCropAndUpload = async () => {
    try {
      if (!completedCrop || !imgRef.current || !user) {
        throw new Error('Crop details or user not found.');
      }

      setUploading(true);
      setIsCropModalOpen(false);

      const croppedBlob = await getCroppedImgBlob(imgRef.current, completedCrop, rotate, scale);
      if (!croppedBlob) throw new Error('Failed to create cropped image.');

      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Photo Updated",
        description: "Your profile picture has been updated successfully.",
      });

      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName || displayName.trim() === '') {
      toast({ title: "Name required", description: "Display name cannot be empty.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() })
        .eq('user_id', user.id);

      if (profileError) console.error("Profile table update error:", profileError);

      toast({
        title: 'Success!',
        description: 'Your profile name has been updated.',
      });

      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- CONTACT DETAILS HANDLERS ---
  const validatePhoneNumber = (value: string): boolean => {
    // Accept Sri Lankan phone numbers: +94 7X XXX XXXX or 07X XXX XXXX
    const phoneRegex = /^(\+94|0)?7\d{8}$/;
    return phoneRegex.test(value.replace(/[\s-]/g, ''));
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !validatePhoneNumber(trimmedPhone)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number (e.g. 0771234567 or +94771234567).',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingContact(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: trimmedPhone || null,
          address: address.trim() || null,
          city: city.trim() || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your contact details have been updated.',
      });

      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update contact details.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  // --- PREFERENCES HANDLERS ---
  const handlePreferenceChange = async (key: string, value: boolean | string) => {
    const result = await updatePreferences({ [key]: value } as any);
    if (result) {
      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been saved.',
      });
    }
  };

  // --- ACCOUNT DELETION ---
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account.');
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });

      await signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Deletion Failed',
        description: error.message || 'An error occurred while deleting your account.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl pb-12">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-5 duration-500">

        <div className="flex items-center gap-4 mb-10 pb-6 border-b-2">
          <div className="bg-primary/10 p-4 rounded-3xl border-2 border-primary/20 shadow-inner hover:rotate-6 transition-transform">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-foreground">My Account Profile</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Manage your personal information, preferences, and profile picture.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-1 space-y-8">
            <Card className="border-2 rounded-2xl shadow-lg overflow-hidden group">
              <div className="bg-gradient-to-r from-muted/60 to-muted/20 h-24 border-b-2 group-hover:from-primary/5 transition-all duration-500" />

              <CardContent className="pt-0 p-6 flex flex-col items-center -mt-12 text-center relative z-10">
                <div className="relative group/avatar">
                  <Avatar className="h-28 w-28 rounded-full border-4 border-background shadow-xl transition-transform duration-500 hover:scale-105 bg-white">
                    {/* @ts-ignore */}
                    <AvatarImage src={(profile as any)?.avatarUrl || (profile as any)?.avatar_url || ''} alt={displayName || 'User'} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-4xl">{getFallback()}</AvatarFallback>
                  </Avatar>

                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full border border-border shadow-lg transition-all duration-300 opacity-90 group-hover/avatar:opacity-100 hover:bg-sky-100 hover:text-sky-700 hover:scale-110"
                    onClick={triggerFileInput}
                    disabled={uploading}
                    type="button"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onSelectFile}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>

                <h2 className="font-extrabold text-xl text-foreground mt-5 flex items-center gap-2 group">
                  {displayName || 'QuickBus User'}
                  <BadgeCheck className="w-5 h-5 text-emerald-500 transition-colors duration-300 group-hover:animate-bounce" />
                </h2>

                {user?.email && (
                  <p className="text-sm text-muted-foreground font-medium -mt-0.5">{user.email}</p>
                )}
              </CardContent>

              <CardFooter className="bg-muted/30 border-t-2 p-5 flex flex-col gap-2">
                <div className="text-sm font-semibold flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-rose-500" /> Account Authorization
                </div>
                <div className={cn(
                  "p-3 rounded-xl border-2 flex items-center gap-3 w-full shadow-inner",
                  isAdmin ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-primary/5 text-primary border-primary/10"
                )}>
                  <User className="w-5 h-5" />
                  <span className="text-sm font-bold capitalize">
                    {isAdmin ? 'System Admin' : 'Standard User Account'}
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-700 delay-150">
            <Card className="border-2 rounded-2xl shadow-lg">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="font-extrabold text-lg flex items-center gap-2.5">
                  <User className="w-5 h-5 text-muted-foreground" /> Personal Details
                </CardTitle>
                <CardDescription>Update your display name and contact information.</CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdateName}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2 opacity-80 cursor-not-allowed">
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="w-4 h-4 text-muted-foreground/60" />
                      Account Email Address (Read-only)
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="h-12 bg-muted/40 border-2 font-medium text-muted-foreground/80 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2 group/input">
                    <Label htmlFor="displayName" className="text-sm font-semibold flex items-center gap-1.5 transition-colors group-hover/input:text-primary">
                      <User className="w-4 h-4 text-muted-foreground transition-colors group-hover/input:text-primary/70" />
                      Your Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter full name"
                      className="h-12 border-2 transition-all hover:border-primary/50 focus:border-primary/70 focus:ring-primary/10"
                    />
                    <p className="text-xs text-muted-foreground ml-1">This name will be visible on tickets and in the application.</p>
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/40 border-t-2 p-5 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading || uploading}
                    className="rounded-full px-6 shadow-sm flex items-center gap-2 group"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* CONTACT DETAILS */}
            <Card className="border-2 rounded-2xl shadow-lg">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="font-extrabold text-lg flex items-center gap-2.5">
                  <Phone className="w-5 h-5 text-muted-foreground" /> Contact Details
                </CardTitle>
                <CardDescription>Update your phone number and address for ticket and support purposes.</CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdateContact}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2 group/input">
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0771234567 or +94771234567"
                      className="h-12 border-2 transition-all hover:border-primary/50 focus:border-primary/70 focus:ring-primary/10"
                    />
                    <p className="text-xs text-muted-foreground ml-1">Used for booking confirmation and support contact.</p>
                  </div>

                  <div className="space-y-2 group/input">
                    <Label htmlFor="address" className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                      className="h-12 border-2 transition-all hover:border-primary/50 focus:border-primary/70 focus:ring-primary/10"
                    />
                  </div>

                  <div className="space-y-2 group/input">
                    <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      City
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="h-12 border-2 transition-all hover:border-primary/50 focus:border-primary/70 focus:ring-primary/10"
                    />
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/40 border-t-2 p-5 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingContact}
                    className="rounded-full px-6 shadow-sm flex items-center gap-2 group"
                  >
                    {isSavingContact ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Contact Details
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* PREFERENCES */}
            <Card className="border-2 rounded-2xl shadow-lg">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="font-extrabold text-lg flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-muted-foreground" /> Preferences
                </CardTitle>
                <CardDescription>Manage your notification preferences and language.</CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {isLoadingPrefs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Email Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive emails about your bookings and updates.</p>
                      </div>
                      <Switch
                        checked={preferences?.emailNotifications ?? true}
                        onCheckedChange={(val) => handlePreferenceChange('emailNotifications', val)}
                        disabled={isSavingPrefs}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Booking Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive notifications about your booking status.</p>
                      </div>
                      <Switch
                        checked={preferences?.bookingNotifications ?? true}
                        onCheckedChange={(val) => handlePreferenceChange('bookingNotifications', val)}
                        disabled={isSavingPrefs}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Promotional Notifications</Label>
                        <p className="text-xs text-muted-foreground">Receive promotional offers and discounts.</p>
                      </div>
                      <Switch
                        checked={preferences?.promotionalNotifications ?? false}
                        onCheckedChange={(val) => handlePreferenceChange('promotionalNotifications', val)}
                        disabled={isSavingPrefs}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        Language
                      </Label>
                      <Select
                        value={preferences?.language || 'en'}
                        onValueChange={(val) => handlePreferenceChange('language', val)}
                        disabled={isSavingPrefs}
                      >
                        <SelectTrigger className="h-12 border-2">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="si">සිංහල (Sinhala)</SelectItem>
                          <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isSavingPrefs && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving preferences...
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ACCOUNT RECOMMENDATION */}
            <Card className="border-2 rounded-2xl shadow-md bg-amber-50/20 border-amber-200 group/alert">
              <CardContent className="p-6 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 group-hover/alert:animate-pulse" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Profile Recommendation</h4>
                  <p className="text-xs text-amber-700/80 mt-0.5">We recommend using a real photo of yourself for easier identification by bus conductors when validating tickets.</p>
                </div>
              </CardContent>
            </Card>

            {/* DELETE ACCOUNT */}
            <Card className="border-2 rounded-2xl shadow-md border-rose-200 bg-rose-50/30">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="font-extrabold text-lg flex items-center gap-2.5 text-rose-600">
                  <Trash2 className="w-5 h-5" /> Delete Account
                </CardTitle>
                <CardDescription>Permanently delete your account and all associated data.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <p className="text-xs text-rose-700/80">
                  This action is irreversible. Deleting your account will permanently remove your profile,
                  preferences, bookings, and all associated data.
                </p>
              </CardContent>
              <CardFooter className="bg-muted/40 border-t-2 p-5 flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="rounded-full px-6 shadow-sm flex items-center gap-2"
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. Your account, profile, preferences, bookings, and all
                        associated data will be permanently deleted from our system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full" disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteAccount();
                        }}
                        className="rounded-full bg-rose-600 hover:bg-rose-700"
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Yes, Delete My Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* CROP MODAL */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-2xl animate-in fade-in zoom-in-95 duration-200 rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl flex items-center gap-2.5">
              <Crop className="w-6 h-6 text-amber-500" />
              Adjust Profile Photo
            </DialogTitle>
            <DialogDescription className="text-base">
              Move, zoom, or rotate the image to fit perfectly inside the circle.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted p-5 rounded-xl border border-border shadow-inner mt-4">
            <div className="flex justify-center items-center h-[350px] overflow-hidden relative border border-border rounded-md bg-muted/60">
              {!!imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="max-h-[350px]"
                  circularCrop
                  keepSelection
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                    onLoad={onImageLoad}
                    className="max-h-[350px]"
                  />
                </ReactCrop>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6 p-4 bg-background rounded-lg border">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5 text-sky-700">
                  <ZoomIn className="w-4 h-4" /> Zoom Image
                </Label>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="flex-grow accent-sky-500"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5 text-amber-700">
                  <RotateCcw className="w-4 h-4" /> Rotate Image
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotate}
                    onChange={(e) => setRotate(Number(e.target.value))}
                    className="flex-grow accent-amber-500"
                  />
                  <span className="text-xs font-mono tabular-nums text-muted-foreground w-12 text-right">{rotate}°</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/40 border-t p-5 mt-4 rounded-b-2xl">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleCropAndUpload} className="rounded-full px-6 shadow-sm flex items-center gap-2 group">
              <BadgeCheck className="w-5 h-5 text-emerald-200 group-hover:animate-bounce" />
              Save & Crop Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
