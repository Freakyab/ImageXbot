'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Folder, File, Plus, Upload, Edit2, Trash2, FolderPlus, Download } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  size?: number;
  createdAt: Date;
  cloudinaryId?: string;
  url?: string;
  format?: string;
}

export default function CloudinaryFileExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPath = searchParams.get('path') || '';
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [jsonData, setJsonData] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Load files from Cloudinary on component mount
  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  // Filter files based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
      if (response.ok) {
        const data = await response.json();
        const parsedFiles = data.files.map((file: any) => ({
          ...file,
          createdAt: new Date(file.createdAt)
        }));
        setFiles(parsedFiles);
      } else {
        console.error('Failed to load files');
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createFolder = async () => {
    if (newFolderName.trim() === '') {
      alert('Please enter a folder name');
      return;
    }

    if (files.some(file => file.name === newFolderName && file.type === 'folder')) {
      alert('Folder with this name already exists');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          path: currentPath
        }),
      });

      if (response.ok) {
        await loadFiles();
        setNewFolderName('');
        setIsCreatingFolder(false);
      } else {
        const error = await response.json();
        alert(`Error creating folder: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder');
    } finally {
      setIsLoading(false);
    }
  };

  const openFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    router.push(`?path=${encodeURIComponent(newPath)}`);
  };

  const goBack = () => {
    if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      const newPath = pathParts.join('/');
      router.push(newPath ? `?path=${encodeURIComponent(newPath)}` : '/');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadId = Date.now().toString();
    setUploadProgress({ ...uploadProgress, [uploadId]: 0 });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);
    formData.append('filename', file.name);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadFiles();
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      } else {
        const error = await response.json();
        alert(`Error uploading file: ${error.message}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }

    // Reset file input
    event.target.value = '';
  };

  const createJsonFile = async () => {
    if (jsonData.trim() === '') {
      alert('Please enter JSON data');
      return;
    }

    const fileName = prompt('Enter filename (without extension):');
    if (!fileName) return;

    try {
      JSON.parse(jsonData); // Validate JSON
      
      const response = await fetch('/api/create-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: `${fileName}.json`,
          content: jsonData,
          path: currentPath
        }),
      });

      if (response.ok) {
        await loadFiles();
        setJsonData('');
        alert('JSON file created successfully!');
      } else {
        const error = await response.json();
        alert(`Error creating JSON file: ${error.message}`);
      }
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const deleteItem = async (id: string) => {
    const item = files.find(f => f.id === id);
    if (!item) return;

    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: item.type,
            cloudinaryId: item.name
          }),
        });

        if (response.ok) {
          await loadFiles();
        } else {
          const error = await response.json();
          alert(`Error deleting item: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRename = (item: FileItem) => {
    setEditingItem(item.id);
    setEditName(item.name);
  };

  const confirmRename = async () => {
    if (editName.trim() === '' || !editingItem) return;

    const item = files.find(f => f.id === editingItem);
    if (!item) return;

    if (files.some(f => f.name === editName && f.id !== editingItem)) {
      alert('Name already exists');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/rename', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          newName: editName,
          type: item.type,
          cloudinaryId: item.cloudinaryId
        }),
      });

      if (response.ok) {
        await loadFiles();
        setEditingItem(null);
        setEditName('');
      } else {
        const error = await response.json();
        alert(`Error renaming item: ${error.message}`);
      }
    } catch (error) {
      console.error('Error renaming item:', error);
      alert('Error renaming item');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelRename = () => {
    setEditingItem(null);
    setEditName('');
  };

  const downloadFile = async (item: FileItem) => {
    if (item.type === 'folder') {
      alert('Cannot download folders. Please download individual files.');
      return;
    }

    if (!item.url) {
      alert('File URL not available');
      return;
    }

    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCurrentFolderName = () => {
    if (!currentPath) return 'Root';
    return currentPath.split('/').pop() || 'Root';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {isLoading && (
              <div className="text-sm text-gray-500">Loading...</div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            {currentPath && (
              <button
                onClick={goBack}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                disabled={isLoading}
              >
                ← Back
              </button>
            )}
            <span className="text-sm text-gray-600">
              Current: {getCurrentFolderName()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
              disabled={isLoading}
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              Import File
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mb-4">
              {Object.entries(uploadProgress).map(([id, progress]) => (
                <div key={id} className="text-sm text-gray-600">
                  Uploading... {progress}%
                </div>
              ))}
            </div>
          )}

          {/* New Folder Input */}
          {isCreatingFolder && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                disabled={isLoading}
              />
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={isLoading}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          )}

          {/* File Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div 
                    className="flex items-center gap-3 flex-1"
                    onClick={() => item.type === 'folder' && openFolder(item.name)}
                  >
                    {item.type === 'folder' ? (
                      <Folder className="w-6 h-6 text-blue-500" />
                    ) : (
                      <File className="w-6 h-6 text-gray-500" />
                    )}
                    
                    <div className="flex-1">
                      {editingItem === item.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            onKeyPress={(e) => e.key === 'Enter' && confirmRename()}
                            onBlur={confirmRename}
                            autoFocus
                            disabled={isLoading}
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.size ? formatFileSize(item.size) : 'Folder'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'file' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(item);
                        }}
                        className="p-1 text-gray-500 hover:text-green-500"
                        title="Download file"
                        disabled={isLoading}
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(item);
                      }}
                      className="p-1 text-gray-500 hover:text-blue-500"
                      title="Rename"
                      disabled={isLoading}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Deleting item:', item);
                        deleteItem(item.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-500"
                      title="Delete"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFiles.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No files found matching your search' : 'No files or folders yet'}
            </div>
          )}
        </div>

        {/* JSON Creator */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Create JSON File</h3>
          <textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder="Enter JSON data here..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isLoading}
          />
          <button
            onClick={createJsonFile}
            className="mt-3 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            disabled={isLoading}
          >
            Create JSON File
          </button>
        </div>
      </div>
    </div>
  );
}