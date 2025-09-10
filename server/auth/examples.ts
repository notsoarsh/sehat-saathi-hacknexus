import express from 'express';
import { 
  authenticateToken, 
  requireRole, 
  authenticateAndAuthorize, 
  optionalAuthentication,
  requireOwnership,
  generateToken,
  type AuthenticatedUser 
} from './index';

const app = express();
app.use(express.json());

// ============================================================================
// EXAMPLE USAGE OF JWT AUTHENTICATION UTILITIES
// ============================================================================

// 1. PUBLIC ROUTE - No authentication required
app.get('/api/public', (req, res) => {
  res.json({ 
    message: 'This is a public endpoint',
    timestamp: new Date().toISOString()
  });
});

// 2. PROTECTED ROUTE - Requires valid JWT token
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'This is a protected endpoint',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// 3. ROLE-BASED PROTECTION - Only doctors can access
app.get('/api/doctor-only', ...authenticateAndAuthorize('doctor'), (req, res) => {
  res.json({ 
    message: 'Only doctors can access this endpoint',
    doctor: req.user,
    timestamp: new Date().toISOString()
  });
});

// 4. MULTIPLE ROLES - Doctors or admins can access
app.get('/api/staff-only', ...authenticateAndAuthorize(['doctor', 'admin']), (req, res) => {
  res.json({ 
    message: 'Doctors and admins can access this endpoint',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// 5. OPTIONAL AUTHENTICATION - Works with or without token
app.get('/api/optional-auth', optionalAuthentication, (req, res) => {
  if (req.user) {
    res.json({ 
      message: 'Hello authenticated user!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } else {
    res.json({ 
      message: 'Hello anonymous user!',
      timestamp: new Date().toISOString()
    });
  }
});

// 6. OWNERSHIP PROTECTION - User can only access their own data
app.get('/api/users/:id/profile', authenticateToken, requireOwnership('id'), (req, res) => {
  res.json({ 
    message: 'User can only access their own profile',
    userId: req.params.id,
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// 7. COMPLEX AUTHORIZATION - Multiple middleware combinations
app.post('/api/admin/users/:id/promote', 
  authenticateToken, 
  requireRole('admin'), 
  requireOwnership('id'), 
  (req, res) => {
    res.json({ 
      message: 'Admin promoting user',
      targetUserId: req.params.id,
      admin: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// ============================================================================
// AUTHENTICATION ENDPOINTS EXAMPLES
// ============================================================================

// Login endpoint example
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate credentials (implement your own logic)
    const user = await validateUserCredentials(email, password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// User profile endpoint with token refresh
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    // Fetch complete user profile
    const userProfile = await getUserProfile(req.user!.id);
    
    res.json({
      success: true,
      user: userProfile
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Logout endpoint (for client-side token invalidation)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ============================================================================
// UTILITY FUNCTIONS (implement these based on your storage)
// ============================================================================

async function validateUserCredentials(email: string, password: string) {
  // Implement your user validation logic here
  // This is just a mock implementation
  return {
    id: '123',
    email: email,
    role: 'patient'
  };
}

async function getUserProfile(userId: string) {
  // Implement your user profile fetching logic here
  // This is just a mock implementation
  return {
    id: userId,
    email: 'user@example.com',
    name: 'John Doe',
    role: 'patient',
    createdAt: new Date().toISOString()
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler for authentication errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }
  
  // Default error handler
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR'
  });
});

export default app;

// ============================================================================
// USAGE EXAMPLES IN CLIENT/FRONTEND
// ============================================================================

/*
// Frontend JavaScript example for using the JWT authentication

// 1. Login and store token
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token in localStorage or secure storage
    localStorage.setItem('authToken', data.token);
    return data.user;
  } else {
    throw new Error(data.message);
  }
}

// 2. Make authenticated requests
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

// 3. Check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// 4. Logout
function logout() {
  localStorage.removeItem('authToken');
  window.location.href = '/login';
}

// 5. Example usage
try {
  const user = await login('user@example.com', 'password');
  console.log('Logged in as:', user);
  
  const response = await makeAuthenticatedRequest('/api/protected');
  const data = await response.json();
  console.log('Protected data:', data);
} catch (error) {
  console.error('Authentication failed:', error.message);
}
*/
