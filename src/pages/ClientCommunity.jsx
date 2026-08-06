import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Trophy,
  Target,
  Zap,
  HelpCircle,
  X,
  Loader2 } from
"lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const postTypeIcons = {
  update: Zap,
  progress: Trophy,
  question: HelpCircle,
  achievement: Trophy,
  motivation: Target
};

const postTypeColors = {
  update: "bg-blue-100 text-blue-700",
  progress: "bg-emerald-100 text-emerald-700",
  question: "bg-amber-100 text-amber-700",
  achievement: "bg-purple-100 text-purple-700",
  motivation: "bg-pink-100 text-pink-700"
};

export default function ClientCommunity() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [newPost, setNewPost] = useState("");
  const [postType, setPostType] = useState("update");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentText, setCommentText] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      if (clients.length > 0) {
        setClient(clients[0]);
      }
    };
    loadUser();
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ["community-posts", client?.trainer_id],
    queryFn: async () => {
      if (!client?.trainer_id) return [];
      return base44.entities.CommunityPost.filter({ trainer_id: client.trainer_id }, "-created_date");
    },
    enabled: !!client?.trainer_id,
    refetchInterval: 5000
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunityPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setNewPost("");
      setUploadedFiles([]);
      setPostType("update");
      toast.success("Post shared with the community!");
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunityPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
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

  const handleCreatePost = async () => {
    if (!newPost.trim() && uploadedFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    await createPostMutation.mutateAsync({
      author_id: user.id,
      author_name: client?.full_name || user.full_name,
      author_avatar: client?.avatar_url,
      trainer_id: client?.trainer_id,
      content: newPost,
      media_urls: uploadedFiles,
      post_type: postType
    });
  };

  const handleLike = async (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.id);

    const updatedLikes = hasLiked ?
    likes.filter((id) => id !== user.id) :
    [...likes, user.id];

    await updatePostMutation.mutateAsync({
      id: post.id,
      data: { likes: updatedLikes }
    });
  };

  const handleComment = async (post) => {
    if (!commentText.trim()) return;

    const comments = post.comments || [];
    const newComment = {
      author_id: user.id,
      author_name: client?.full_name || user.full_name,
      author_avatar: client?.avatar_url,
      content: commentText,
      timestamp: new Date().toISOString(),
      is_trainer: false
    };

    await updatePostMutation.mutateAsync({
      id: post.id,
      data: { comments: [...comments, newComment] }
    });

    setCommentText("");
    setCommentingOn(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-foreground text-3xl font-bold">Community</h1>
        <p className="text-foreground mt-1">Connect with your training partners</p>
      </div>

      {/* Create Post */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={client?.avatar_url} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {client?.full_name?.[0] || user?.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Share your progress, ask questions, or motivate others..."
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
                    id="file-upload"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden" />

                  <label htmlFor="file-upload">
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
                      <SelectItem value="update" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Update</SelectItem>
                      <SelectItem value="progress" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Progress</SelectItem>
                      <SelectItem value="question" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Question</SelectItem>
                      <SelectItem value="achievement" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Achievement</SelectItem>
                      <SelectItem value="motivation" className="hover:bg-accent focus:bg-secondary focus:text-foreground cursor-pointer">Motivation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreatePost}
                  disabled={createPostMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600">

                  {createPostMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Share
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => {
          const TypeIcon = postTypeIcons[post.post_type] || Zap;
          const hasLiked = (post.likes || []).includes(user?.id);

          return (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author_avatar} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700">
                      {post.author_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{post.author_name}</span>
                      <Badge className={cn("text-xs", postTypeColors[post.post_type])}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {post.post_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="mt-2 text-slate-700 whitespace-pre-wrap">{post.content}</p>
                    
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
                        onClick={() => handleLike(post)}
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
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-slate-100">
                        {(post.comments || []).map((comment, idx) =>
                      <div key={idx} className="flex gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={comment.author_avatar} />
                              <AvatarFallback className="text-xs bg-slate-100">
                                {comment.author_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{comment.author_name}</span>
                                {comment.is_trainer &&
                            <Badge className="text-xs bg-emerald-100 text-emerald-700">Trainer</Badge>
                            }
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                            </div>
                          </div>
                      )}
                      </div>
                    }
                    
                    {/* Comment Input */}
                    {commentingOn === post.id &&
                    <div className="mt-4 flex gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client?.avatar_url} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                            {client?.full_name?.[0]}
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
                          onClick={() => handleComment(post)}
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

        })}

        {posts.length === 0 &&
        <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 font-medium text-slate-900">No posts yet</h3>
              <p className="text-sm text-slate-500 mt-1">
                Be the first to share your progress with the community!
              </p>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}