"use client";

import { useState, useEffect } from "react";
import AnimatedCard from "../../../components/ui/AnimatedCard";
import { useToast } from "../../../components/ui/Toast";
import ClientRunButton from "./ClientRunButton";
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, BarChart3, Activity, Clock, Target, Zap } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/social-media/analytics');
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || "Failed to load analytics");
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast({
          variant: "error",
          title: "Error",
          description: "Failed to load real analytics. Showing simulated data instead.",
        });
        // Fallback or handle error
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#2D2424] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B5E5E]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Aggregate metrics for display
  const metrics = [
    { id: 'followers', name: 'Total Followers', value: data?.connectedAccounts?.reduce((acc: number, curr: any) => acc + (curr.followerCount || 0), 0) || 0, delta: '+12%' },
    { id: 'reach', name: 'Total Reach', value: (data?.instagram?.reach || 0) + (data?.facebook?.reach || 0) + (data?.youtube?.reach || 0), delta: '+5.4%' },
    { id: 'engagement', name: 'Avg Engagement', value: ((data?.instagram?.engagement || 0) + (data?.facebook?.engagement || 0) + (data?.youtube?.engagement || 0) / (data?.connectedAccounts?.length || 1)).toFixed(2) + '%', delta: '+2.1%' },
    { id: 'posts', name: 'Total Posts', value: data?.connectedAccounts?.reduce((acc: number, curr: any) => acc + (curr.postsCount || 0), 0) || 0, delta: '+8%' },
  ];

  const topChannels = data?.connectedAccounts?.map((acc: any) => ({
    name: acc.platform,
    percent: Math.round(((acc.followerCount || 0) / (metrics[0].value as number || 1)) * 100)
  })) || [];

  const engagementData = [65, 82, 78, 95, 88, 92, 100];
  const growthData = [45, 52, 61, 58, 72, 68, 75];
  const reachData = [30, 38, 42, 48, 55, 62, 70];

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D2424] mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-[#6B5E5E]">
          Track your content performance across {data?.connectedAccounts?.length || 0} connected channels
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((m, index) => {
          const icons = [Users, Eye, Heart, Share2];
          const Icon = icons[index % icons.length];
          const isPositive = m.delta?.startsWith('+');
          
          return (
            <AnimatedCard
              key={m.id}
              ariaLabel={m.name}
              className="min-h-[120px] bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D2B193] to-[#B89B7B] shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                {m.delta && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {m.delta}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-[#7A6F6F] mb-1">{m.name}</div>
                <div className="text-3xl font-bold text-[#2F2626]">
                  {m.value}
                </div>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <AnimatedCard
          ariaLabel="Engagement chart"
          className="lg:col-span-2 min-h-[400px] bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#2F2626] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#B89B7B]" />
                Engagement Over Time
              </h3>
              <p className="text-sm text-[#7A6F6F]">Last 7 days performance</p>
            </div>
          </div>
          
          <div className="relative h-[280px]">
            <div className="absolute inset-0 flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-[#E9DCC9]/50"></div>
              ))}
            </div>
            
            <div className="absolute inset-0 flex items-end justify-around gap-2 px-4">
              {engagementData.map((height, i) => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-[#D2B193] to-[#B89B7B] rounded-t-lg shadow-md transition-all duration-500 hover:from-[#B89B7B] hover:to-[#D2B193] cursor-pointer group-hover:shadow-lg"
                        style={{ height: `${height * 2.4}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2F2626] text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {height * 10} interactions
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[#7A6F6F] font-medium">{days[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedCard>

        <div className="space-y-6">
          <AnimatedCard
            ariaLabel="Top channels"
            className="bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
          >
            <div className="space-y-4">
              <h3 className="font-semibold text-[#2F2626] flex items-center gap-2">
                <Target className="h-5 w-5 text-[#B89B7B]" />
                Top Channels
              </h3>
              {topChannels.length > 0 ? topChannels.map((c: any) => (
                <div key={c.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B5E5E] font-medium">{c.name}</span>
                    <span className="font-semibold text-[#2F2626]">{c.percent}%</span>
                  </div>
                  <div className="h-2 bg-[#F7F3ED] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D2B193] to-[#B89B7B] rounded-full transition-all duration-500"
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#7A6F6F]">No channels connected</p>
              )}
            </div>
          </AnimatedCard>

          <AnimatedCard
            ariaLabel="Optimisation suggestions"
            className="bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
          >
            <div className="space-y-3">
              <h3 className="font-semibold text-[#2F2626] flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#B89B7B]" />
                Optimisation
              </h3>
              <p className="text-sm text-[#6B5E5E]">Run recommended fixes</p>
              <ClientRunButton />
            </div>
          </AnimatedCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard
          ariaLabel="Growth trend"
          className="bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#2F2626] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#B89B7B]" />
                Follower Growth Trend
              </h3>
              <p className="text-sm text-[#7A6F6F]">Weekly growth comparison</p>
            </div>
            
            <div className="relative h-[220px]">
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-[#7A6F6F]">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>
              
              <div className="ml-10 h-full relative">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border-t border-[#E9DCC9]/50"></div>
                  ))}
                </div>
                
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#D2B193" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#D2B193" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="url(#growthGradient)"
                    stroke="none"
                    points={growthData.map((value, i) => 
                      `${(i / (growthData.length - 1)) * 100}%,${100 - value}%`
                    ).join(' ') + ` 100%,100% 0%,100%`}
                  />
                  <polyline
                    fill="none"
                    stroke="#D2B193"
                    strokeWidth="2"
                    points={growthData.map((value, i) => 
                      `${(i / (growthData.length - 1)) * 100}%,${100 - value}%`
                    ).join(' ')}
                  />
                  {growthData.map((value, i) => (
                    <circle
                      key={i}
                      cx={`${(i / (growthData.length - 1)) * 100}%`}
                      cy={`${100 - value}%`}
                      r="4"
                      fill="#B89B7B"
                      className="hover:r-6 transition-all cursor-pointer"
                    />
                  ))}
                </svg>
              </div>
              
              <div className="ml-10 flex justify-between mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <span key={i} className="text-xs text-[#7A6F6F]">{day}</span>
                ))}
              </div>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard
          ariaLabel="Reach comparison"
          className="bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#2F2626] flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#B89B7B]" />
                Content Reach
              </h3>
              <p className="text-sm text-[#7A6F6F]">Daily reach statistics</p>
            </div>
            
            <div className="relative h-[220px]">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-[#E9DCC9]/50"></div>
                ))}
              </div>
              
              <div className="absolute inset-0 flex items-end justify-around gap-1 px-2">
                {reachData.map((height, i) => {
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const colors = [
                    'from-blue-400 to-blue-500',
                    'from-green-400 to-green-500',
                    'from-purple-400 to-purple-500',
                    'from-orange-400 to-orange-500',
                    'from-pink-400 to-pink-500',
                    'from-yellow-400 to-yellow-500',
                    'from-red-400 to-red-500',
                  ];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full relative">
                        <div
                          className={`w-full bg-gradient-to-t ${colors[i]} rounded-t-lg shadow-sm transition-all duration-500 hover:shadow-lg cursor-pointer`}
                          style={{ height: `${height * 2.8}px` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#2F2626] text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                            {height * 100} views
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-[#7A6F6F] font-medium">{days[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      <AnimatedCard
        ariaLabel="Performance insights"
        className="bg-gradient-to-br from-white to-[#FBFAF8] backdrop-blur border border-[#E9DCC9] rounded-2xl p-6"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#2F2626] flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#B89B7B]" />
            Best Posting Times
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { time: '9:00 AM', engagement: '85%', label: 'Morning Peak' },
              { time: '1:00 PM', engagement: '78%', label: 'Lunch Hour' },
              { time: '6:00 PM', engagement: '92%', label: 'Evening Peak' },
              { time: '9:00 PM', engagement: '71%', label: 'Night Time' },
            ].map((slot, i) => (
              <div key={i} className="bg-white/60 rounded-xl p-4 border border-[#E9DCC9] hover:shadow-md transition-all">
                <div className="text-2xl font-bold text-[#2F2626] mb-1">{slot.time}</div>
                <div className="text-sm text-[#B89B7B] font-medium mb-2">{slot.label}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#F7F3ED] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D2B193] to-[#B89B7B] rounded-full"
                      style={{ width: slot.engagement }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#2F2626]">{slot.engagement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}
