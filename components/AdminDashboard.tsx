import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, GeneratedAsset } from '../types';
import { Users, Database, Plus, Search, Loader2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assetsCount, setAssetsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Profiles
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Count Assets (Approximate)
      const { count, error: assetsError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });
        
      if (!assetsError) {
        setAssetsCount(count || 0);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (userId: string, amount: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const newCredits = (user.credits || 0) + amount;
      
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
    } catch (error) {
      console.error("Error adding credits:", error);
      alert("Failed to update credits");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.id.includes(searchTerm)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
          <p className="text-zinc-400">Manage users and monitor system usage.</p>
        </div>
        <button 
           onClick={fetchData}
           className="p-2 bg-surface hover:bg-white/10 rounded-lg text-white border border-white/10"
        >
          <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">Total Users</span>
          </div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>
        
        <div className="bg-surface border border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">Total Assets</span>
          </div>
          <div className="text-3xl font-bold text-white">{assetsCount}</div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-semibold text-white">User Management</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Credits</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white text-sm">
                    {user.email}
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{user.id}</div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      user.role === 'admin' 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-white font-medium">
                    {user.credits}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                         onClick={() => handleAddCredits(user.id, 100)}
                         className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/20 flex items-center gap-1 transition-colors"
                       >
                         <Plus className="w-3 h-3" /> 100 Credits
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;