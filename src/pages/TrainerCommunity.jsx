import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Lightbulb,
  HelpCircle,
  Trophy,
  BookOpen,
  MessageSquare,
  X,
  Loader2,
  Users } from
"lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const trainerPostTypes = {
  tip: { icon: Lightbulb, color: "bg-amber-100 text-amber-700", label: "Tip" },
  question: { icon: HelpCircle, color: "bg-blue-100 text-blue-700", label: "Question" },
  success_story: { icon: Trophy, color: "bg-emerald-100 text-emerald-700", label: "Success Story" },
  resource: { icon: BookOpen, color: "bg-purple-100 text-purple-700", label: "Resource" },
  discussion: { icon: MessageSquare, color: "bg-slate-100 text-slate-700", label: "Discussion" }
};

const clientPostTypes = {
  update: { icon: MessageSquare, color: "bg-blue-100 text-blue-700" },
  progress: { icon: Trophy, color: "bg-emerald-100 text-emerald-700" },
  question: { icon: HelpCircle, color: "bg-amber-100 text-amber-700" },
  achievement: { icon: Trophy, color: "bg-purple-100 text-purple-700" },
  motivation: { icon: MessageSquare, color: "bg-pink-100 text-pink-700" }
};

export default function TrainerCommunity() {
  const [user, setUser] = useState(null);
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState("trainers");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Trainer community posts
  const { data: trainerPosts = [] } = useQuery({
    queryKey: ["trainer-community-posts"],
    queryFn: () => base44.entities.TrainerCommunityPost.list("-created_date"),
    refetchInterval: 5000
  });

  // Client community posts (my clients only)
  const { data: clientPosts = [] } = useQuery({
    queryKey: ["client-community-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.CommunityPost.filter({ trainer_id: user.id }, "-created_date");
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const createTrainerPostMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainerCommunityPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-community-posts"] });
      setNewPost("");
      setUploadedFiles([]);
      setPostType("discussion");
      toast.success("Post shared with trainers!");
    }
  });

  const updateTrainerPostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainerCommunityPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainer-community-posts"] });
    }
  });

  const updateClientPostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunityPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-community-posts"] });
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map((file) =>
      base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...results.map((r) => r.file_url)]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTrainerPost = async () => {
    if (!newPost.trim() && uploadedFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    await createTrainerPostMutation.mutateAsync({
      author_id: user.id,
      author_name: user.full_name,
      author_avatar: user.avatar_url,
      content: newPost,
      media_urls: uploadedFiles,
      post_type: postType
    });
  };

  const handleLikeTrainerPost = async (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.id);

    const updatedLikes = hasLiked ?
    likes.filter((id) => id !== user.id) :
    [...likes, user.id];

    await updateTrainerPostMutation.mutateAsync({
      id: post.id,
      data: { likes: updatedLikes }
    });
  };

  const handleLikeClientPost = async (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.id);

    const updatedLikes = hasLiked ?
    likes.filter((id) => id !== user.id) :
    [...likes, user.id];

    await updateClientPostMutation.mutateAsync({
      id: post.id,
      data: { likes: updatedLikes }
    });
  };

  const handleCommentTrainerPost = async (post) => {
    if (!commentText.trim()) return;

    const comments = post.comments || [];
    const newComment = {
      author_id: user.id,
      author_name: user.full_name,
      author_avatar: user.avatar_url,
      content: commentText,
      timestamp: new Date().toISOString()
    };

    await updateTrainerPostMutation.mutateAsync({
      id: post.id,
      data: { comments: [...comments, newComment] }
    });

    setCommentText("");
    setCommentingOn(null);
  };

  const handleCommentClientPost = async (post) => {
    if (!commentText.trim()) return;

    const comments = post.comments || [];
    const newComment = {
      author_id: user.id,
      author_name: user.full_name,
      author_avatar: user.avatar_url,
      content: commentText,
      timestamp: new Date().toISOString(),
      is_trainer: true
    };

    await updateClientPostMutation.mutateAsync({
      id: post.id,
      data: { comments: [...comments, newComment] }
    });

    setCommentText("");
    setCommentingOn(null);
  };

  const renderPost = (post, isTrainerPost) => {
    const postTypes = isTrainerPost ? trainerPostTypes : clientPostTypes;
    const TypeIcon = postTypes[post.post_type]?.icon || MessageSquare;
    const hasLiked = (post.likes || []).includes(user?.id);
    const handleLike = isTrainerPost ? () => handleLikeTrainerPost(post) : () => handleLikeClientPost(post);
    const handleComment = isTrainerPost ? () => handleCommentTrainerPost(post) : () => handleCommentClientPost(post);

    return (
      <Card key={post.id} className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author_avatar} />
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
                {post.author_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{post.author_name}</span>
                <Badge className={cn("text-xs border-border", postTypes[post.post_type]?.color)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {isTrainerPost ? postTypes[post.post_type]?.label : post.post_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                </span>
              </div>
              
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{post.content}</p>
              
              {post.media_urls?.length > 0 &&
              <div className="mt-3 grid grid-cols-2 gap-2">
                  {(post.media_urls || []).map((url, idx) =>
                <img
                  key={idx}
                  src={url}
                  alt=""
                  className="rounded-lg w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')} />

                )}
                </div>
              }
              
              <div className="mt-4 flex items-center gap-4 text-sm">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    hasLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                  )}>

                  <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
                  <span>{(post.likes || []).length}</span>
                </button>
                
                <button
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors">

                  <MessageCircle className="w-4 h-4" />
                  <span>{(post.comments || []).length}</span>
                </button>
              </div>
              
              {/* Comments */}
              {post.comments?.length > 0 &&
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-border">
                  {(post.comments || []).map((comment, idx) =>
                <div key={idx} className="flex gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment.author_avatar} />
                        <AvatarFallback className="text-xs bg-secondary text-foreground">
                          {comment.author_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{comment.author_name}</span>
                          {comment.is_trainer &&
                      <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Trainer</Badge>
                      }
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                )}
                </div>
              }
              
              {/* Comment Input */}
              {commentingOn === post.id &&
              <div className="mt-4 flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                      {user?.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-20 text-sm" />

                    <Button
                    size="sm"
                    onClick={handleComment}
                    disabled={!commentText.trim()}>

                      Post
                    </Button>
                  </div>
                </div>
              }
            </div>
          </div>
        </CardContent>
      </Card>);

  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-foreground">
        <h1 className="text-foreground text-3xl font-bold">Community</h1>
        <p className="text-foreground mt-1">Connect with trainers and support your clients</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary border border-border flex flex-wrap h-auto">
          <TabsTrigger value="trainers" className="gap-2">
            <Users className="w-4 h-4" />
            Trainer Community
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            My Clients
          </TabsTrigger>
        </TabsList>

        {/* Trainer Community Tab */}
        <TabsContent value="trainers" className="space-y-6">
          {/* Create Post */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
                    {user?.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="Share tips, ask questions, or discuss with fellow trainers..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-24 resize-none" />

                  
                  {uploadedFiles.length > 0 &&
                  <div className="grid grid-cols-3 gap-2">
                      {uploadedFiles.map((url, idx) =>
                    <div key={idx} className="relative group">
                          <img src={url} alt="" className="rounded-lg w-full h-24 object-cover" />
                          <button
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-secondary rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">

                            <X className="w-3 h-3 text-foreground" />
                          </button>
                        </div>
                    )}
                    </div>
                  }

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="trainer-file-upload"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden" />

                      <label htmlFor="trainer-file-upload">
                        <Button variant="outline" size="sm" disabled={uploading} asChild>
                          <span>
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                            {uploading ? "Uploading..." : "Add Media"}
                          </span>
                        </Button>
                      </label>
                      
                      <Select value={postType} onValueChange={setPostType}>
                        <SelectTrigger className="w-[140px] h-9 input-frosted border-0 text-foreground">
                          <SelectValue placeholder="Post Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                          <SelectItem value="discussion" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Discussion</SelectItem>
                          <SelectItem value="tip" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Tip</SelectItem>
                          <SelectItem value="question" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Question</SelectItem>
                          <SelectItem value="success_story" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Success Story</SelectItem>
                          <SelectItem value="resource" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Resource</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleCreateTrainerPost}
                      disabled={createTrainerPostMutation.isPending}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600">

                      {createTrainerPostMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trainer Posts Feed */}
          <div className="space-y-4">
            {trainerPosts.map((post) => renderPost(post, true))}

            {trainerPosts.length === 0 &&
            <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-600" />
                  <h3 className="mt-4 font-medium text-foreground">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to share with the trainer community!
                  </p>
                </CardContent>
              </Card>
            }
          </div>
        </TabsContent>

        {/* Client Community Tab */}
        <TabsContent value="clients" className="space-y-4">
          {clientPosts.map((post) => renderPost(post, false))}

          {clientPosts.length === 0 &&
          <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-600" />
                <h3 className="mt-4 font-medium text-foreground">No client posts yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your clients haven't shared anything in the community yet
                </p>
              </CardContent>
            </Card>
          }
        </TabsContent>
      </Tabs>
    </div>);

}