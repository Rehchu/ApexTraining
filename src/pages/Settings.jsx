import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  User,
  Mail,
  Phone,
  Building,
  Save,
  Camera,
  Bell,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Key,
  Trash2,
  AlertTriangle,
  MonitorSmartphone,
  LayoutDashboard,
  Shield,
  Plug,
  Download,
  Loader2,
  Sun,
  Moon } from
"lucide-react";
// Beta keys are managed via the BetaKey entity
import { Button } from "@/components/ui/button";
import InstallGuide from "@/components/InstallGuide";
import NotificationSettings from "@/components/NotificationSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";
import { useTheme } from "@/components/hooks/useTheme";
import ClientPortalSettings from "@/components/settings/ClientPortalSettings";
import ComplianceSettings from "@/components/settings/ComplianceSettings";
import BillingSettings from "@/components/settings/BillingSettings";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  // Billing is a trainer concern; a trainer who also has a client record still needs it.
  const isTrainer = user?.user_type === "trainer" || user?.role === "admin";
  // Beta-key trainers are comped for life, so billing is irrelevant to them —
  // hide the tab entirely rather than showing a plan they will never buy.
  const isCompedTrainer = !!(
    user?.beta_key_used || user?.data?.beta_key_used ||
    user?.beta_key_verified || user?.data?.beta_key_verified
  );
  const showBilling = isTrainer && !isCompedTrainer;
  const { system, setUnitSystem } = useUnitSystem();
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    business_name: "",
    specializations: "",
    require_onboarding_forms: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email_reminders: true,
    session_alerts: true,
    client_updates: false,
    progress_updates: true,
    achievement_alerts: true,
    new_messages: true,
    gamification_alerts: true,
    new_plans: true,
    trainer_feedback: true
  });
  const [betaKey, setBetaKey] = useState("");
  const [betaKeyVerified, setBetaKeyVerified] = useState(false);
  const [betaKeyError, setBetaKeyError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Check if user is a client
        let isClientUser = userData.role === 'user' && userData.user_type === 'client';
        if (!isClientUser) {
          const clientRecords = await base44.entities.Client.filter({ email: userData.email });
          isClientUser = clientRecords.length > 0;
        }
        setIsClient(isClientUser && userData.role !== 'admin');

        setFormData({
          full_name: userData.data?.full_name || userData.full_name || "",
          phone: userData.data?.phone || userData.phone || "",
          bio: userData.data?.bio || userData.bio || "",
          business_name: userData.data?.business_name || userData.business_name || "",
          specializations: userData.data?.specializations || userData.specializations || "",
          require_onboarding_forms: userData.data?.require_onboarding_forms ?? userData.require_onboarding_forms ?? true,
          payout_method: userData.data?.payout_method || userData.payout_method || "stripe"
        });
        setBetaKeyVerified(userData.data?.beta_key_verified || userData?.beta_key_verified || false);

        const userNotes = userData.data?.notifications || {};
        setNotifications({
          email_reminders: userNotes.email_reminders ?? true,
          session_alerts: userNotes.session_alerts ?? true,
          client_updates: userNotes.client_updates ?? false,
          progress_updates: userNotes.progress_updates ?? true,
          achievement_alerts: userNotes.achievement_alerts ?? true,
          new_messages: userNotes.new_messages ?? true,
          gamification_alerts: userNotes.gamification_alerts ?? true,
          new_plans: userNotes.new_plans ?? true,
          trainer_feedback: userNotes.trainer_feedback ?? true
        });
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  const handleNotificationChange = async (field, value) => {
    const newNotifications = { ...notifications, [field]: value };
    setNotifications(newNotifications);
    try {
      await base44.auth.updateMe({ notifications: newNotifications });
    } catch (error) {
      console.error("Failed to update notifications:", error);
      toast.error("Failed to update preferences");
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      console.log("Saving form data:", formData);
      const saveResponse = await base44.auth.updateMe({
        ...formData,
        full_name: formData.full_name // Still try to set root level
      });

      // In Base44, full_name is built-in. If an admin updated data.full_name, we should keep it in sync.
      // We can do this by calling a simple backend function or we just rely on root full_name.
      // Actually, since we updated TrainerManagement to set data.full_name, let's also clear data.full_name here.
      // But we can't do that easily via updateMe since it doesn't allow nested data updates directly.
      // Let's just update the root. It should be fine.
      console.log("Save response:", saveResponse);
      console.log("Update successful");
      const updatedUser = await base44.auth.me();
      console.log("Updated user:", updatedUser);
      setUser(updatedUser);
      setFormData({
      full_name: updatedUser.data?.full_name || updatedUser.full_name || "",
      phone: updatedUser.data?.phone || updatedUser.phone || "",
      bio: updatedUser.data?.bio || updatedUser.bio || "",
      business_name: updatedUser.data?.business_name || updatedUser.business_name || "",
      specializations: updatedUser.data?.specializations || updatedUser.specializations || "",
      require_onboarding_forms: updatedUser.data?.require_onboarding_forms ?? updatedUser.require_onboarding_forms ?? true,
      payout_method: updatedUser.data?.payout_method || updatedUser.payout_method || "stripe"
      });
      window.dispatchEvent(new Event('profileUpdated'));
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings: " + error.message);
    }
    setIsLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBetaKeyVerify = async () => {
    setBetaKeyError("");
    if (!betaKey.trim()) {
      setBetaKeyError("Please enter a beta key");
      return;
    }

    try {
      const upperKey = betaKey.toUpperCase();
      const keys = await base44.entities.BetaKey.filter({ key: upperKey });

      if (keys.length === 0) {
        setBetaKeyError("Invalid beta key. Please check and try again.");
        return;
      }

      const keyRecord = keys[0];

      if (keyRecord.status === "assigned" && keyRecord.trainer_id && keyRecord.trainer_id !== user.id) {
        setBetaKeyError("This beta key has already been claimed.");
        return;
      }

      await base44.entities.BetaKey.update(keyRecord.id, {
        status: "assigned",
        trainer_id: user.id,
        trainer_email: user.email
      });

      await base44.auth.updateMe({ beta_key_verified: true, beta_key: upperKey });
      setBetaKeyVerified(true);
      setBetaKey("");

      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      window.dispatchEvent(new Event('profileUpdated'));

      toast.success("Beta key verified successfully!");
    } catch (error) {
      console.error(error);
      setBetaKeyError("Failed to verify beta key. Please try again.");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadPromise = async () => {
      const res = await base44.integrations.Core.UploadFile({ file });
      const file_url = res.file_url || res.data?.file_url;
      await base44.auth.updateMe({ avatar_url: file_url });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      window.dispatchEvent(new Event('profileUpdated'));
    };

    toast.promise(uploadPromise(), {
      loading: 'Uploading photo...',
      success: 'Profile photo updated!',
      error: 'Failed to upload photo'
    });
    
    e.target.value = '';
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadPromise = async () => {
      const res = await base44.integrations.Core.UploadFile({ file });
      const file_url = res.file_url || res.data?.file_url;
      await base44.auth.updateMe({ business_logo_url: file_url });
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      window.dispatchEvent(new Event('profileUpdated'));
    };

    toast.promise(uploadPromise(), {
      loading: 'Uploading logo...',
      success: 'Business logo updated!',
      error: 'Failed to upload logo'
    });
    
    e.target.value = '';
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await base44.auth.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apexcoach-data-${new Date().toLocaleDateString("sv-SE")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const total = Object.values(data.record_counts || {}).reduce((n, c) => n + c, 0);
      toast.success(`Exported ${total} record${total === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error("Failed to export your data: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      await base44.auth.deleteMe();
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => {
        base44.auth.logout();
      }, 1500);
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account: " + error.message);
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>);

  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="flex justify-center w-full pb-2">
          <TabsList className="bg-secondary border border-border p-1 flex flex-wrap h-auto justify-center w-full sm:w-auto max-w-full gap-1">
            <TabsTrigger value="profile" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Profile
            </TabsTrigger>
            {!isClient && !betaKeyVerified &&
            <TabsTrigger value="beta" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
                <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Beta Access
              </TabsTrigger>
            }
            {!isClient &&
            <TabsTrigger value="portal" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Client Portal
              </TabsTrigger>
            }
            <TabsTrigger value="notifications" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="pwa" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
              <MonitorSmartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> App
            </TabsTrigger>
            {showBilling && (
              <TabsTrigger value="billing" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Billing
              </TabsTrigger>
            )}
            {!isClient && (
              <TabsTrigger value="compliance" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Compliance
              </TabsTrigger>
            )}
            <TabsTrigger value="account" className="flex-1 sm:flex-none text-xs sm:text-sm gap-1.5 sm:gap-2 whitespace-nowrap">
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Account
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Photo */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Profile Photo</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                  <AvatarImage src={user.avatar_url || user.data?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-foreground text-2xl">
                    {(user.data?.full_name || user.full_name)?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg">
                  <Camera className="w-4 h-4 text-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div>
                <p className="font-medium text-foreground">{user.data?.full_name || user.full_name || "Your Name"}</p>
                <p className="text-sm text-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Upload a photo to personalize your account</p>
              </div>
            </div>
          </div>

          {!isClient && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Business Logo</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg bg-black">
                    {(user.data?.business_logo_url || user.business_logo_url) ? (
                      <AvatarImage src={user.data?.business_logo_url || user.business_logo_url} className="object-contain" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-foreground text-2xl">
                        <Building className="w-8 h-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg">
                    <Camera className="w-4 h-4 text-foreground" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
                <div>
                  <p className="font-medium text-foreground">Logo</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload your business logo to display in the app</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-foreground space-y-2">
                <Label htmlFor="full_name" className="text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                  <Input
                    id="full_name"
                    placeholder="Your full name"
                    className="pl-10 input-frosted"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)} />

                </div>
              </div>

              <div className="text-foreground space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="pl-10 input-frosted opacity-50" />

                </div>
              </div>

              <div className="text-foreground space-y-2">
                <Label htmlFor="phone" className="text-muted-foreground">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1 234 567 890"
                    className="pl-10 input-frosted"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)} />

                </div>
              </div>

              {!isClient && (
                <div className="text-foreground space-y-2">
                  <Label htmlFor="business_name" className="text-muted-foreground">Business Name</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                    <Input
                      id="business_name"
                      placeholder="Your gym or business"
                      className="pl-10 input-frosted"
                      value={formData.business_name}
                      onChange={(e) => handleChange("business_name", e.target.value)} />

                  </div>
                </div>
              )}

              {!isClient && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specializations" className="text-muted-foreground">Specializations</Label>
                  <Input
                    id="specializations"
                    placeholder="e.g., Strength Training, Weight Loss, HIIT"
                    className="input-frosted"
                    value={formData.specializations}
                    onChange={(e) => handleChange("specializations", e.target.value)} />

                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio" className="text-muted-foreground">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell clients about yourself..."
                  className="min-h-[100px] input-frosted"
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)} />

              </div>
              
              {!isClient &&
              <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary">
                    <div>
                      <Label htmlFor="require_onboarding_forms" className="text-foreground font-medium text-base">Require Onboarding Forms</Label>
                      <p className="text-sm text-foreground mt-1">When enabled, clients must complete PAR-Q, Intake, and Medical forms. If disabled, forms are optional.</p>
                    </div>
                    <Switch
                    id="require_onboarding_forms"
                    checked={formData.require_onboarding_forms}
                    onCheckedChange={(v) => handleChange("require_onboarding_forms", v)} />

                  </div>
                </div>
              }

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary">
                  <div>
                    <Label className="text-foreground font-medium text-base">Unit System</Label>
                    <p className="text-sm text-foreground mt-1">Choose between Imperial (lbs/in) and Metric (kg/cm) units.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${system === 'imperial' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>Imperial</span>
                    <Switch
                      checked={system === 'metric'}
                      onCheckedChange={(v) => setUnitSystem(v ? 'metric' : 'imperial')}
                    />
                    <span className={`text-sm ${system === 'metric' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>Metric</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  console.log("Button clicked!");
                  handleSave();
                }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={isLoading}>

                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {!isClient && !betaKeyVerified &&
        <TabsContent value="beta" className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Beta Access Required</h3>
              <p className="text-sm text-foreground mb-6">
                This is a beta feature. Enter your beta key to unlock full access.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="beta_key" className="text-muted-foreground">Beta Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                    <Input
                    id="beta_key"
                    placeholder="e.g., JSMITH-4K7X8Q2P"
                    className="pl-10 uppercase input-frosted"
                    value={betaKey}
                    onChange={(e) => {
                      setBetaKey(e.target.value);
                      setBetaKeyError("");
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleBetaKeyVerify()} />

                  </div>
                  {betaKeyError &&
                <p className="text-sm text-red-600 mt-1">{betaKeyError}</p>
                }
                </div>

                <Button
                onClick={handleBetaKeyVerify}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 w-full">

                  Verify Beta Key
                </Button>
              </div>
            </div>
          </TabsContent>
        }

        {!isClient &&
        <TabsContent value="portal" className="space-y-6">
          <ClientPortalSettings />
        </TabsContent>
        }

        <TabsContent value="notifications" className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email Reminders</p>
                  <p className="text-sm text-foreground">Get email reminders before sessions</p>
                </div>
                <Switch
                  checked={notifications.email_reminders}
                  onCheckedChange={(v) => handleNotificationChange('email_reminders', v)} />

              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Session Alerts</p>
                  <p className="text-sm text-foreground">Receive alerts for upcoming sessions</p>
                </div>
                <Switch
                  checked={notifications.session_alerts}
                  onCheckedChange={(v) => handleNotificationChange('session_alerts', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">New Messages</p>
                  <p className="text-sm text-foreground">Get notified when you receive a new message</p>
                </div>
                <Switch
                  checked={notifications.new_messages}
                  onCheckedChange={(v) => handleNotificationChange('new_messages', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Gamification Alerts</p>
                  <p className="text-sm text-foreground">Notifications for level ups, badges, and loot drops</p>
                </div>
                <Switch
                  checked={notifications.gamification_alerts}
                  onCheckedChange={(v) => handleNotificationChange('gamification_alerts', v)} />
              </div>

              {isClient && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">New Plans</p>
                      <p className="text-sm text-foreground">Get notified when your trainer assigns a new plan</p>
                    </div>
                    <Switch
                      checked={notifications.new_plans}
                      onCheckedChange={(v) => handleNotificationChange('new_plans', v)} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Trainer Feedback</p>
                      <p className="text-sm text-foreground">Notifications when your trainer leaves feedback</p>
                    </div>
                    <Switch
                      checked={notifications.trainer_feedback}
                      onCheckedChange={(v) => handleNotificationChange('trainer_feedback', v)} />
                  </div>
                </>
              )}
              {!isClient && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Client Updates</p>
                      <p className="text-sm text-foreground">Get notified when clients update their info</p>
                    </div>
                    <Switch
                      checked={notifications.client_updates}
                      onCheckedChange={(v) => handleNotificationChange('client_updates', v)} />

                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Progress Updates</p>
                      <p className="text-sm text-foreground">Get notified of client progress milestones</p>
                    </div>
                    <Switch
                      checked={notifications.progress_updates}
                      onCheckedChange={(v) => handleNotificationChange('progress_updates', v)} />

                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Achievement Alerts</p>
                      <p className="text-sm text-foreground">Celebrate when clients earn achievements</p>
                    </div>
                    <Switch
                      checked={notifications.achievement_alerts}
                      onCheckedChange={(v) => handleNotificationChange('achievement_alerts', v)} />

                  </div>
                </>
              )}
                </div>
                </div>
                <div className="mt-6">
                  <NotificationSettings />
                </div>
                </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          {/* Appearance */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">Appearance</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how ApexCoach looks on this device. "System" follows your phone or
              computer's own light/dark setting.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { value: "light", label: "Light", Icon: Sun },
                { value: "dark", label: "Dark", Icon: Moon },
                { value: "system", label: "System", Icon: MonitorSmartphone },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={theme === value}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                    theme === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Tip: press <kbd className="px-1 py-0.5 rounded border border-border bg-secondary">Ctrl</kbd>
              {" + "}<kbd className="px-1 py-0.5 rounded border border-border bg-secondary">K</kbd> anywhere
              to open the command palette and switch themes instantly.
            </p>
          </div>

          <InstallGuide />
        </TabsContent>

        {showBilling && (
          <TabsContent value="billing" className="space-y-6">
            <BillingSettings />
          </TabsContent>
        )}

        {!isClient && (
          <TabsContent value="compliance" className="space-y-6">
            <ComplianceSettings />
          </TabsContent>
        )}

        <TabsContent value="account" className="space-y-6">
          {/* Right of access — download everything we hold on this account */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Export My Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download a complete copy of your account and records as a JSON file — your profile,
              plans, logs, progress, and documents. You have a right to this copy at any time.
            </p>
            <Button variant="outline" onClick={handleExportData} disabled={isExporting} className="gap-2">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Preparing..." : "Download my data"}
            </Button>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Danger Zone</p>
                <p className="text-sm text-red-300">Deleting your account is permanent and cannot be undone</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
            <p className="text-sm text-foreground mb-6">
              Once you delete your account, all of your data — clients, workout and meal plans, progress logs, journals, documents, and messages — is permanently removed. This cannot be reversed, so export a copy first if you want one.
            </p>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2">

              <Trash2 className="w-4 h-4" />
              Delete My Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-muted-foreground">
              <p>This will permanently delete your account and remove all your data including:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-foreground">
                <li>Physical metrics and logged progress</li>
                <li>Journals, documents, and signed agreements</li>
                <li>Workout and meal plans</li>
                <li>Messages and notifications</li>
              </ul>
              <p className="font-semibold text-red-400 mt-4">This action cannot be undone.</p>
              <div className="space-y-2 mt-4 text-left">
                <Label htmlFor="delete-confirm" className="text-foreground">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="uppercase input-frosted border-red-500/30 focus:border-red-500 text-foreground" />

              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmText("");
            }} className="bg-secondary text-foreground hover:bg-accent border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              className="bg-red-600 hover:bg-red-700">

              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}