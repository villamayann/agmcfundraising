// Updated React Component with Google Sheets Integration
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Download, Upload, DollarSign, Target, TrendingUp, Users, Receipt, RefreshCw } from 'lucide-react';

// Google Sheets Configuration
const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE', // Replace with your actual API key
  spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE', // Replace with your sheet ID
  range: 'Sheet1!A:F'
};

const FundraisingTracker = () => {
  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  const [initiativeTypes, setInitiativeTypes] = useState([
    'sponsorship', 'raffle', 'weekly', 'event', 'donation', 'merchandise', 'other'
  ]);
  
  const [newInitiative, setNewInitiative] = useState({
    name: '',
    target: '',
    type: 'sponsorship'
  });
  
  const [newTransaction, setNewTransaction] = useState({
    initiativeId: null,
    amount: '',
    source: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [newType, setNewType] = useState('');

  // Initialize Google Sheets API
  const initializeGoogleSheets = async () => {
    try {
      if (!window.gapi) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => window.gapi.load('client', resolve);
          document.head.appendChild(script);
        });
      }

      await window.gapi.client.init({
        apiKey: GOOGLE_SHEETS_CONFIG.apiKey,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
      });

      return true;
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      alert('Failed to connect to Google Sheets. Check your API key and configuration.');
      return false;
    }
  };

  // Load data from Google Sheets
  const loadFromGoogleSheets = async () => {
    try {
      setIsLoading(true);
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
        range: GOOGLE_SHEETS_CONFIG.range
      });

      const values = response.result.values || [];
      if (values.length <= 1) {
        setIsLoading(false);
        return;
      }

      const [headers, ...rows] = values;
      const loadedInitiatives = rows.map(row => ({
        id: parseInt(row[0]) || Date.now(),
        name: row[1] || '',
        target: parseFloat(row[2]) || 0,
        current: parseFloat(row[3]) || 0,
        type: row[4] || 'other',
        transactions: JSON.parse(row[5] || '[]')
      }));

      setInitiatives(loadedInitiatives);
      setLastSync(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading from Google Sheets:', error);
      setIsLoading(false);
      alert('Failed to load data from Google Sheets. Check your permissions.');
    }
  };

  // Save data to Google Sheets
  const saveToGoogleSheets = async (updatedInitiatives = initiatives) => {
    try {
      setIsLoading(true);
      const headers = ['ID', 'Name', 'Target', 'Current', 'Type', 'Transactions'];
      const rows = updatedInitiatives.map(init => [
        init.id,
        init.name,
        init.target,
        init.current,
        init.type,
        JSON.stringify(init.transactions)
      ]);

      const values = [headers, ...rows];

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
        range: GOOGLE_SHEETS_CONFIG.range,
        valueInputOption: 'RAW',
        resource: { values }
      });

      setLastSync(new Date());
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      setIsLoading(false);
      alert('Failed to save data to Google Sheets.');
      return false;
    }
  };

  // Connect to Google Sheets
  const connectGoogleSheets = async () => {
    if (googleSheetsConnected) {
      setGoogleSheetsConnected(false);
      return;
    }

    const success = await initializeGoogleSheets();
    if (success) {
      setGoogleSheetsConnected(true);
      await loadFromGoogleSheets();
    }
  };

  // Auto-save when data changes
  useEffect(() => {
    if (googleSheetsConnected && initiatives.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToGoogleSheets();
      }, 2000); // Auto-save after 2 seconds of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [initiatives, googleSheetsConnected]);

  // Rest of your existing functions (formatCurrency, calculations, etc.)
  const totalTarget = initiatives.reduce((sum, init) => sum + init.target, 0);
  const totalCurrent = initiatives.reduce((sum, init) => sum + init.current, 0);
  const overallProgress = (totalCurrent / totalTarget) * 100 || 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const handleAddInitiative = async () => {
    if (newInitiative.name && newInitiative.target) {
      const newId = Math.max(0, ...initiatives.map(i => i.id)) + 1;
      const updatedInitiatives = [...initiatives, {
        id: newId,
        name: newInitiative.name,
        target: parseFloat(newInitiative.target),
        current: 0,
        type: newInitiative.type,
        transactions: []
      }];
      
      setInitiatives(updatedInitiatives);
      setNewInitiative({ name: '', target: '', type: 'sponsorship' });
      setShowAddModal(false);

      if (googleSheetsConnected) {
        await saveToGoogleSheets(updatedInitiatives);
      }
    }
  };

  const handleAddTransaction = async () => {
    if (newTransaction.amount && newTransaction.source && newTransaction.initiativeId) {
      const amount = parseFloat(newTransaction.amount);
      const updatedInitiatives = initiatives.map(init => {
        if (init.id === newTransaction.initiativeId) {
          return {
            ...init,
            current: init.current + amount,
            transactions: [...init.transactions, {
              date: newTransaction.date,
              amount: amount,
              source: newTransaction.source,
              description: newTransaction.description || 'No description'
            }]
          };
        }
        return init;
      });

      setInitiatives(updatedInitiatives);
      setNewTransaction({
        initiativeId: null,
        amount: '',
        source: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowTransactionModal(false);

      if (googleSheetsConnected) {
        await saveToGoogleSheets(updatedInitiatives);
      }
    }
  };

  const handleAddType = () => {
    if (newType && !initiativeTypes.includes(newType.toLowerCase())) {
      setInitiativeTypes([...initiativeTypes, newType.toLowerCase()]);
      setNewType('');
      setShowAddTypeModal(false);
    }
  };

  const exportData = () => {
    const data = {
      initiatives,
      summary: {
        totalTarget,
        totalCurrent,
        overallProgress: overallProgress.toFixed(2)
      },
      exportDate: new Date().toISOString(),
      lastSync: lastSync
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundraising-tracker-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fundraising Tracker</h1>
              <p className="text-gray-600 mt-2">
                Managing multiple fundraising initiatives
                {lastSync && (
                  <span className="text-sm text-green-600 ml-2">
                    Last synced: {lastSync.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Receipt className="w-4 h-4 inline mr-2" />
                Add Transaction
              </button>
              <button
                onClick={connectGoogleSheets}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  googleSheetsConnected 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 inline mr-2" />
                )}
                {googleSheetsConnected ? 'Connected' : 'Connect Sheets'}
              </button>
              <button
                onClick={exportData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export Data
              </button>
            </div>
          </div>

          {/* Overall Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Target</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
                </div>
                <Target className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Raised</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCurrent)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Overall Progress</p>
                  <p className="text-2xl font-bold">{overallProgress.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Remaining</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalTarget - totalCurrent)}</p>
                </div>
                <Users className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Rest of your existing JSX components... */}
        {/* (Include all the modals and initiative cards from your original component) */}
      </div>
    </div>
  );
};

export default FundraisingTracker;
