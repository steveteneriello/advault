import React, { useState } from 'react';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Category } from '@/lib/campaign-manager-types';

interface CategoryManagerProps {
  categories: Category[];
  isLoading: boolean;
  onSave: (category: Category) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  isLoading,
  onSave,
  onDelete,
  onRefresh
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Category>({
    name: '',
    description: '',
    parent_category_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    // Check for duplicate name
    const existingCategory = categories.find(
      c => c.name.toLowerCase() === formData.name.toLowerCase() && c.id !== formData.id
    );
    if (existingCategory) {
      newErrors.name = 'A category with this name already exists';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(formData);
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      parent_category_id: ''
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      name: category.name,
      description: category.description || '',
      parent_category_id: category.parent_category_id || ''
    });
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      parent_category_id: ''
    });
    setErrors({});
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</CardTitle>
            <CardDescription>
              {editingCategory ? 'Update category details' : 'Create a new category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter category name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parent_category_id">Parent Category</Label>
                <select
                  id="parent_category_id"
                  name="parent_category_id"
                  value={formData.parent_category_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm"
                >
                  <option value="">None (Top Level)</option>
                  {categories
                    .filter(c => c.id !== formData.id) // Prevent self-reference
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter category description"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-between pt-4">
                {editingCategory ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Update Category
                    </Button>
                  </>
                ) : (
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Manage your campaign categories
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-700 rounded-lg">
                <p className="text-zinc-400 mb-4">No categories found</p>
                <Button onClick={() => setEditingCategory(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Parent</th>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => {
                      const parentCategory = categories.find(c => c.id === category.parent_category_id);
                      
                      return (
                        <tr key={category.id} className="border-b border-zinc-800">
                          <td className="py-3 px-4 font-medium">{category.name}</td>
                          <td className="py-3 px-4">{parentCategory?.name || '-'}</td>
                          <td className="py-3 px-4">
                            {category.description ? (
                              <span className="line-clamp-2">{category.description}</span>
                            ) : (
                              <span className="text-zinc-500">No description</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this category?')) {
                                    onDelete(category.id!);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CategoryManager;