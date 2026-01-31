import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import type { User, AuthState, SignInCredentials, SignUpCredentials, Permissions, UserRole } from './types'
import { ROLE_PERMISSIONS } from './types'

interface AuthContextValue extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<void>
  signUp: (credentials: SignUpCredentials) => Promise<void>
  signOut: () => Promise<void>
  permissions: Permissions
  hasPermission: (permission: keyof Permissions) => boolean
  isRole: (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  supabase: SupabaseClient
}

export function AuthProvider({ children, supabase }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as User
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [supabase])

  // Handle auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setState({
          user: profile,
          loading: false,
          error: null,
        })
      } else {
        setState({ user: null, loading: false, error: null })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        setState({ user: profile, loading: false, error: null })
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, error: null })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile])

  // Sign in
  const signIn = async (credentials: SignInCredentials) => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      }))
      throw error
    }
  }

  // Sign up
  const signUp = async (credentials: SignUpCredentials) => {
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) throw authError

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: credentials.email,
          name: credentials.name,
          role: credentials.role,
          phone: credentials.phone,
        })

        if (profileError) throw profileError
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign up failed',
      }))
      throw error
    }
  }

  // Sign out
  const signOut = async () => {
    setState((s) => ({ ...s, loading: true }))
    await supabase.auth.signOut()
    setState({ user: null, loading: false, error: null })
  }

  // Get permissions based on user role
  const permissions: Permissions = state.user
    ? ROLE_PERMISSIONS[state.user.role]
    : ROLE_PERMISSIONS.worker

  // Check if user has a specific permission
  const hasPermission = (permission: keyof Permissions): boolean => {
    return permissions[permission]
  }

  // Check if user has a specific role
  const isRole = (role: UserRole | UserRole[]): boolean => {
    if (!state.user) return false
    if (Array.isArray(role)) {
      return role.includes(state.user.role)
    }
    return state.user.role === role
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        permissions,
        hasPermission,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking permissions
export function usePermission(permission: keyof Permissions) {
  const { hasPermission, loading } = useAuth()
  return { hasPermission: hasPermission(permission), loading }
}

// Hook for checking roles
export function useRole(role: UserRole | UserRole[]) {
  const { isRole, loading } = useAuth()
  return { isRole: isRole(role), loading }
}
