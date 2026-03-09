import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BlockListEntry {
  id: string;
  list_type: string;
  entry_type: string;
  entry_value: string;
  notes: string;
  created_at: string;
}

export function BlockLists() {
  const [blockList, setBlockList] = useState<BlockListEntry[]>([]);
  const [allowList, setAllowList] = useState<BlockListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newEntry, setNewEntry] = useState({
    list_type: 'block',
    entry_type: 'phone',
    entry_value: '',
    notes: ''
  });

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_block_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBlockList(data?.filter(d => d.list_type === 'block') || []);
      setAllowList(data?.filter(d => d.list_type === 'allow') || []);
    } catch (error: any) {
      console.error('Failed to load lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async () => {
    if (!newEntry.entry_value.trim()) return;

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_block_lists')
        .insert({
          user_id: user.id,
          ...newEntry
        });

      if (error) throw error;

      setNewEntry({
        list_type: 'block',
        entry_type: 'phone',
        entry_value: '',
        notes: ''
      });

      await loadLists();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAdding(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_block_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadLists();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const renderList = (list: BlockListEntry[], title: string, variant: 'destructive' | 'default') => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {variant === 'destructive' ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Shield className="h-5 w-5 text-green-500" />
          )}
          {title}
        </CardTitle>
        <CardDescription>
          {variant === 'destructive' 
            ? 'Automatically block these contacts from reaching you'
            : 'Always allow these trusted contacts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No entries yet</p>
        ) : (
          <div className="space-y-2">
            {list.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {entry.entry_type}
                    </Badge>
                    <span className="font-medium">{entry.entry_value}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground">{entry.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteEntry(entry.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Custom Block & Allow Lists</h1>
          <p className="text-muted-foreground">
            Manage your personal blocklist and trusted contacts
          </p>
        </div>

        {/* Add New Entry */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>List Type</Label>
                <select
                  value={newEntry.list_type}
                  onChange={(e) => setNewEntry({ ...newEntry, list_type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="block">Block List</option>
                  <option value="allow">Allow List</option>
                </select>
              </div>

              <div>
                <Label>Entry Type</Label>
                <select
                  value={newEntry.entry_type}
                  onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="phone">Phone Number</option>
                  <option value="email">Email Address</option>
                  <option value="url">Website/URL</option>
                  <option value="ip">IP Address</option>
                </select>
              </div>

              <div>
                <Label>Value</Label>
                <Input
                  value={newEntry.entry_value}
                  onChange={(e) => setNewEntry({ ...newEntry, entry_value: e.target.value })}
                  placeholder="Enter phone, email, URL, or IP"
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="Why are you blocking/allowing this?"
                />
              </div>
            </div>

            <Button
              onClick={addEntry}
              disabled={adding || !newEntry.entry_value.trim()}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {adding ? 'Adding...' : 'Add Entry'}
            </Button>
          </CardContent>
        </Card>

        {/* Lists */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your lists...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderList(blockList, 'Block List', 'destructive')}
            {renderList(allowList, 'Allow List', 'default')}
          </div>
        )}
      </div>
    </div>
  );
}
