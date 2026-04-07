'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { AnimatedCard } from '@/components/animated-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  X,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'

export function FinancesView() {
  const {
    transactions,
    financeCategories,
    addTransaction,
    deleteTransaction,
  } = useStore()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    categoryId: '',
    isEssential: true,
  })
  
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.substring(0, 7)
  
  // Calculate stats
  const stats = useMemo(() => {
    const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth))
    
    const monthIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const monthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const essentialExpenses = monthTransactions
      .filter((t) => t.type === 'expense' && t.isEssential)
      .reduce((sum, t) => sum + t.amount, 0)
    
    const nonEssentialExpenses = monthExpenses - essentialExpenses
    
    const balance = monthIncome - monthExpenses
    
    // Expenses by category
    const expensesByCategory = financeCategories
      .filter((c) => c.type === 'expense')
      .map((category) => {
        const categoryTotal = monthTransactions
          .filter((t) => t.categoryId === category.id && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
        
        return {
          ...category,
          total: categoryTotal,
          budgetProgress: category.budget ? (categoryTotal / category.budget) * 100 : 0,
        }
      })
      .filter((c) => c.total > 0 || c.budget)
      .sort((a, b) => b.total - a.total)
    
    return {
      monthIncome,
      monthExpenses,
      essentialExpenses,
      nonEssentialExpenses,
      balance,
      expensesByCategory,
    }
  }, [transactions, financeCategories, currentMonth])
  
  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 15)
  }, [transactions])
  
  const handleAddTransaction = () => {
    if (!newTransaction.amount || !newTransaction.categoryId) return
    
    addTransaction({
      type: transactionType,
      amount: parseFloat(newTransaction.amount),
      description: newTransaction.description,
      categoryId: newTransaction.categoryId,
      date: today,
      isEssential: newTransaction.isEssential,
      isRecurring: false,
    })
    
    setNewTransaction({ amount: '', description: '', categoryId: '', isEssential: true })
    setShowAddModal(false)
  }
  
  const getCategoryById = (id: string) => financeCategories.find((c) => c.id === id)
  
  const availableCategories = financeCategories.filter((c) => c.type === transactionType)
  
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Finances</h1>
          <p className="text-muted-foreground">Gérez votre budget et vos dépenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Transaction</span>
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <AnimatedCard delay={100}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-chart-2" />
            <span className="text-sm text-muted-foreground">Revenus</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-chart-2">
            +{stats.monthIncome.toLocaleString('fr-FR')} €
          </p>
        </AnimatedCard>
        
        <AnimatedCard delay={200}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-chart-5" />
            <span className="text-sm text-muted-foreground">Dépenses</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-chart-5">
            -{stats.monthExpenses.toLocaleString('fr-FR')} €
          </p>
        </AnimatedCard>
        
        <AnimatedCard delay={300}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Solde</span>
          </div>
          <p className={cn(
            'text-xl md:text-2xl font-bold',
            stats.balance >= 0 ? 'text-chart-2' : 'text-chart-5'
          )}>
            {stats.balance >= 0 ? '+' : ''}{stats.balance.toLocaleString('fr-FR')} €
          </p>
        </AnimatedCard>
        
        <AnimatedCard delay={400}>
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-5 h-5 text-chart-4" />
            <span className="text-sm text-muted-foreground">Superflus</span>
          </div>
          <p className="text-xl md:text-2xl font-bold">
            {stats.nonEssentialExpenses.toLocaleString('fr-FR')} €
          </p>
        </AnimatedCard>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Budget by Category */}
        <AnimatedCard delay={500}>
          <h3 className="font-semibold mb-4">Budget par catégorie</h3>
          
          {stats.expensesByCategory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune dépense ce mois-ci
            </p>
          ) : (
            <div className="space-y-4">
              {stats.expensesByCategory.map((category) => (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="text-sm">
                      <span className={cn(
                        'font-medium',
                        category.budget && category.budgetProgress > 100 && 'text-chart-5'
                      )}>
                        {category.total.toLocaleString('fr-FR')} €
                      </span>
                      {category.budget && (
                        <span className="text-muted-foreground">
                          {' '}/ {category.budget} €
                        </span>
                      )}
                    </div>
                  </div>
                  {category.budget && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          category.budgetProgress > 100 ? 'bg-chart-5' : 'bg-primary'
                        )}
                        style={{ 
                          width: `${Math.min(100, category.budgetProgress)}%`,
                          backgroundColor: category.budgetProgress <= 100 ? category.color : undefined,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>
        
        {/* Recent Transactions */}
        <AnimatedCard delay={600}>
          <h3 className="font-semibold mb-4">Transactions récentes</h3>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentTransactions.map((transaction) => {
                const category = getCategoryById(transaction.categoryId)
                const isIncome = transaction.type === 'income'
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isIncome ? 'bg-chart-2/10' : 'bg-chart-5/10'
                      )}
                    >
                      {isIncome ? (
                        <ArrowUpCircle className="w-5 h-5 text-chart-2" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-chart-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {transaction.description || category?.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{category?.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(transaction.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {!transaction.isEssential && transaction.type === 'expense' && (
                          <>
                            <span>•</span>
                            <span className="text-chart-4">Superflu</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className={cn(
                      'font-semibold',
                      isIncome ? 'text-chart-2' : 'text-chart-5'
                    )}>
                      {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('fr-FR')} €
                    </p>
                    
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </AnimatedCard>
      </div>
      
      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <AnimatedCard className="relative w-full max-w-md z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouvelle transaction</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                <Button
                  variant={transactionType === 'expense' ? 'default' : 'outline'}
                  onClick={() => {
                    setTransactionType('expense')
                    setNewTransaction((prev) => ({ ...prev, categoryId: '' }))
                  }}
                  className="flex-1"
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Dépense
                </Button>
                <Button
                  variant={transactionType === 'income' ? 'default' : 'outline'}
                  onClick={() => {
                    setTransactionType('income')
                    setNewTransaction((prev) => ({ ...prev, categoryId: '' }))
                  }}
                  className="flex-1"
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Revenu
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Montant (€)</label>
                <Input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Description (optionnel)</label>
                <Input
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Courses au supermarché"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Catégorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setNewTransaction((prev) => ({ ...prev, categoryId: category.id }))}
                      className={cn(
                        'p-3 rounded-xl text-sm transition-all',
                        newTransaction.categoryId === category.id
                          ? 'ring-2 ring-primary'
                          : 'bg-muted hover:bg-muted-foreground/20'
                      )}
                      style={{
                        backgroundColor: newTransaction.categoryId === category.id ? `${category.color}20` : undefined,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate block">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {transactionType === 'expense' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewTransaction((prev) => ({ ...prev, isEssential: !prev.isEssential }))}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      newTransaction.isEssential
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {newTransaction.isEssential && (
                      <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12">
                        <path
                          fill="currentColor"
                          d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z"
                        />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm">Dépense essentielle</span>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleAddTransaction} className="flex-1" disabled={!newTransaction.amount || !newTransaction.categoryId}>
                  Ajouter
                </Button>
              </div>
            </div>
          </AnimatedCard>
        </div>
      )}
    </div>
  )
}
