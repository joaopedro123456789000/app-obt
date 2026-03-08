#!/usr/bin/env python3
"""
EcoPonto BR Backend API Test Suite
Tests all backend endpoints according to test_result.md requirements
"""

import asyncio
import aiohttp
import base64
import json
from datetime import datetime
import sys
import os

# Backend URL from frontend env
BACKEND_URL = "https://recicla-smart-1.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

class BackendTester:
    def __init__(self):
        self.session = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'total': 0,
            'details': []
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        self.results['total'] += 1
        status = "✅ PASS" if success else "❌ FAIL"
        color = Colors.GREEN if success else Colors.RED
        
        print(f"{color}{status}{Colors.END} {test_name}: {message}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            
        self.results['details'].append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details
        })
    
    async def test_endpoint(self, method, endpoint, expected_status=None, auth_required=False, data=None, headers=None):
        """Generic endpoint tester"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                async with self.session.get(url, headers=headers) as response:
                    status = response.status
                    try:
                        json_response = await response.json()
                    except:
                        json_response = await response.text()
                    
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data, headers=headers) as response:
                    status = response.status
                    try:
                        json_response = await response.json()
                    except:
                        json_response = await response.text()
            
            return status, json_response
            
        except Exception as e:
            return None, str(e)
    
    async def test_collection_points(self):
        """Test Collection Points API"""
        print(f"\n{Colors.BLUE}🏢 Testing Collection Points API{Colors.END}")
        
        # Test GET /api/collection-points
        status, response = await self.test_endpoint('GET', '/collection-points')
        
        if status == 200:
            if isinstance(response, list) and len(response) >= 3:
                # Check for São Paulo points
                sao_paulo_points = [p for p in response if p.get('city', '').lower() == 'são paulo']
                if len(sao_paulo_points) >= 2:
                    self.log_result("Collection Points Basic", True, f"Found {len(response)} points, {len(sao_paulo_points)} in São Paulo")
                    
                    # Verify structure
                    first_point = response[0]
                    required_fields = ['point_id', 'name', 'latitude', 'longitude', 'types_accepted', 'city']
                    missing_fields = [field for field in required_fields if field not in first_point]
                    
                    if not missing_fields:
                        self.log_result("Collection Points Structure", True, "All required fields present")
                    else:
                        self.log_result("Collection Points Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_result("Collection Points São Paulo", False, f"Only {len(sao_paulo_points)} São Paulo points found, expected at least 2")
            else:
                self.log_result("Collection Points Basic", False, f"Expected list with 3+ points, got {type(response)} with {len(response) if isinstance(response, list) else 0} items")
        else:
            self.log_result("Collection Points Basic", False, f"Status {status}: {response}")
        
        # Test filters - waste_type
        status, response = await self.test_endpoint('GET', '/collection-points?waste_type=plastic')
        if status == 200:
            if isinstance(response, list):
                # Check if all returned points accept plastic
                plastic_points = [p for p in response if 'plastic' in p.get('types_accepted', [])]
                if len(plastic_points) == len(response):
                    self.log_result("Collection Points Filter (waste_type)", True, f"Filter working: {len(plastic_points)} plastic points")
                else:
                    self.log_result("Collection Points Filter (waste_type)", False, f"Filter issue: {len(plastic_points)}/{len(response)} points accept plastic")
            else:
                self.log_result("Collection Points Filter (waste_type)", False, f"Expected list, got {type(response)}")
        else:
            self.log_result("Collection Points Filter (waste_type)", False, f"Status {status}: {response}")
        
        # Test filters - city
        status, response = await self.test_endpoint('GET', '/collection-points?city=São Paulo')
        if status == 200:
            if isinstance(response, list):
                sao_paulo_results = [p for p in response if 'são paulo' in p.get('city', '').lower()]
                if len(sao_paulo_results) > 0:
                    self.log_result("Collection Points Filter (city)", True, f"City filter working: {len(sao_paulo_results)} São Paulo points")
                else:
                    self.log_result("Collection Points Filter (city)", False, "No São Paulo points returned with city filter")
            else:
                self.log_result("Collection Points Filter (city)", False, f"Expected list, got {type(response)}")
        else:
            self.log_result("Collection Points Filter (city)", False, f"Status {status}: {response}")
    
    async def test_news_api(self):
        """Test News API - Critical RSS Feeds"""
        print(f"\n{Colors.BLUE}📰 Testing News API (CRITICAL - Real RSS Feeds){Colors.END}")
        
        # Test GET /api/news
        status, response = await self.test_endpoint('GET', '/news')
        
        if status == 200:
            if isinstance(response, list) and len(response) > 0:
                self.log_result("News Basic Fetch", True, f"Fetched {len(response)} news articles")
                
                # Check structure and sources
                first_article = response[0]
                required_fields = ['article_id', 'title', 'url', 'source', 'category', 'published_at']
                missing_fields = [field for field in required_fields if field not in first_article]
                
                if not missing_fields:
                    self.log_result("News Structure", True, "All required fields present")
                    
                    # Check for expected sources
                    sources = set([article.get('source', '') for article in response])
                    expected_sources = ['agencia_brasil', 'ibama', 'mma', 'inpe']
                    found_sources = [s for s in expected_sources if s in sources]
                    
                    if len(found_sources) >= 2:
                        self.log_result("News Sources", True, f"Found {len(found_sources)} government sources: {found_sources}")
                    else:
                        self.log_result("News Sources", False, f"Only found {len(found_sources)} sources: {found_sources}, expected government RSS feeds")
                    
                    # Check categories
                    categories = set([article.get('category', '') for article in response])
                    expected_categories = ['deforestation', 'recycling', 'climate', 'wildlife']
                    found_categories = [c for c in expected_categories if c in categories]
                    
                    if len(found_categories) >= 2:
                        self.log_result("News Categories", True, f"Found categories: {found_categories}")
                    else:
                        self.log_result("News Categories", False, f"Limited categories: {found_categories}")
                
                else:
                    self.log_result("News Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("News Basic Fetch", False, f"Expected non-empty list, got {type(response)} with {len(response) if isinstance(response, list) else 0} items")
        else:
            self.log_result("News Basic Fetch", False, f"Status {status}: {response}")
        
        # Test category filter
        status, response = await self.test_endpoint('GET', '/news?category=deforestation')
        if status == 200:
            if isinstance(response, list):
                deforestation_articles = [a for a in response if a.get('category') == 'deforestation']
                if len(deforestation_articles) == len(response):
                    self.log_result("News Category Filter", True, f"Category filter working: {len(deforestation_articles)} deforestation articles")
                else:
                    self.log_result("News Category Filter", False, f"Category filter issue: {len(deforestation_articles)}/{len(response)} are deforestation")
            else:
                self.log_result("News Category Filter", False, f"Expected list, got {type(response)}")
        else:
            self.log_result("News Category Filter", False, f"Status {status}: {response}")
        
        # Test force refresh
        status, response = await self.test_endpoint('POST', '/news/refresh')
        if status == 200:
            if isinstance(response, dict) and response.get('success'):
                self.log_result("News Force Refresh", True, f"Refresh successful, count: {response.get('count', 0)}")
            else:
                self.log_result("News Force Refresh", False, f"Unexpected response: {response}")
        else:
            self.log_result("News Force Refresh", False, f"Status {status}: {response}")
    
    async def test_challenges_api(self):
        """Test Challenges API"""
        print(f"\n{Colors.BLUE}🏆 Testing Challenges API{Colors.END}")
        
        # Test GET /api/challenges
        status, response = await self.test_endpoint('GET', '/challenges')
        
        if status == 200:
            if isinstance(response, list) and len(response) >= 2:
                self.log_result("Challenges Basic", True, f"Found {len(response)} challenges")
                
                # Check structure
                first_challenge = response[0]
                required_fields = ['challenge_id', 'title', 'description', 'goal', 'reward_points']
                missing_fields = [field for field in required_fields if field not in first_challenge]
                
                if not missing_fields:
                    self.log_result("Challenges Structure", True, "All required fields present")
                else:
                    self.log_result("Challenges Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Challenges Basic", False, f"Expected list with 2+ challenges, got {type(response)} with {len(response) if isinstance(response, list) else 0} items")
        else:
            self.log_result("Challenges Basic", False, f"Status {status}: {response}")
    
    async def test_rankings_api(self):
        """Test Rankings API"""
        print(f"\n{Colors.BLUE}🏅 Testing Rankings API{Colors.END}")
        
        # Test GET /api/rankings/global
        status, response = await self.test_endpoint('GET', '/rankings/global')
        
        if status == 200:
            if isinstance(response, list):
                self.log_result("Rankings Global", True, f"Global ranking returned {len(response)} users")
                
                if len(response) > 0:
                    # Check structure
                    first_user = response[0]
                    required_fields = ['user_id', 'user_name', 'points', 'rank']
                    missing_fields = [field for field in required_fields if field not in first_user]
                    
                    if not missing_fields:
                        self.log_result("Rankings Structure", True, "All required fields present")
                    else:
                        self.log_result("Rankings Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("Rankings Global", False, f"Expected list, got {type(response)}")
        else:
            self.log_result("Rankings Global", False, f"Status {status}: {response}")
        
        # Test city ranking
        status, response = await self.test_endpoint('GET', '/rankings/city/São%20Paulo')
        if status == 200:
            if isinstance(response, list):
                self.log_result("Rankings City", True, f"City ranking returned {len(response)} users")
            else:
                self.log_result("Rankings City", False, f"Expected list, got {type(response)}")
        else:
            self.log_result("Rankings City", False, f"Status {status}: {response}")
    
    async def test_auth_endpoints(self):
        """Test Authentication Endpoints"""
        print(f"\n{Colors.BLUE}🔐 Testing Authentication Endpoints{Colors.END}")
        
        # Test Google login redirect
        status, response = await self.test_endpoint('GET', '/auth/google-login')
        if status in [302, 307]:  # Redirect statuses
            self.log_result("Auth Google Login", True, f"Google login redirects correctly (status {status})")
        else:
            self.log_result("Auth Google Login", False, f"Expected redirect, got status {status}: {response}")
        
        # Test /auth/me without authentication (should return 401)
        status, response = await self.test_endpoint('GET', '/auth/me')
        if status == 401:
            self.log_result("Auth Me (Unauthenticated)", True, "Correctly returns 401 without auth")
        else:
            self.log_result("Auth Me (Unauthenticated)", False, f"Expected 401, got {status}: {response}")
    
    async def test_deliveries_api(self):
        """Test Deliveries API (AI Integration)"""
        print(f"\n{Colors.BLUE}📦 Testing Deliveries API (AI Integration){Colors.END}")
        
        # Test GET /api/deliveries without auth (should return 401)
        status, response = await self.test_endpoint('GET', '/deliveries')
        if status == 401:
            self.log_result("Deliveries (Unauthenticated)", True, "Correctly returns 401 without auth")
        else:
            self.log_result("Deliveries (Unauthenticated)", False, f"Expected 401, got {status}: {response}")
        
        # Test POST /api/deliveries without auth (should return 401)
        sample_delivery = {
            "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "point_id": "test_point_123",
            "weight_kg": 1.5
        }
        
        status, response = await self.test_endpoint('POST', '/deliveries', data=sample_delivery)
        if status == 401:
            self.log_result("Deliveries POST (Unauthenticated)", True, "Correctly returns 401 without auth for AI classification")
        else:
            self.log_result("Deliveries POST (Unauthenticated)", False, f"Expected 401, got {status}: {response}")
    
    async def test_admin_stats(self):
        """Test Admin Stats API"""
        print(f"\n{Colors.BLUE}📊 Testing Admin Stats API{Colors.END}")
        
        # Test GET /api/admin/stats without auth (should return 401)
        status, response = await self.test_endpoint('GET', '/admin/stats')
        if status == 401:
            self.log_result("Admin Stats (Unauthenticated)", True, "Correctly returns 401 without auth")
        else:
            self.log_result("Admin Stats (Unauthenticated)", False, f"Expected 401, got {status}: {response}")
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print(f"{Colors.BOLD}🚀 EcoPonto BR Backend API Test Suite{Colors.END}")
        print(f"Testing backend: {BACKEND_URL}")
        print("=" * 60)
        
        try:
            await self.test_collection_points()
            await self.test_news_api()
            await self.test_challenges_api()
            await self.test_rankings_api()
            await self.test_auth_endpoints()
            await self.test_deliveries_api()
            await self.test_admin_stats()
            
        except Exception as e:
            print(f"{Colors.RED}Test suite error: {e}{Colors.END}")
        
        # Summary
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}📋 TEST SUMMARY{Colors.END}")
        print(f"Total Tests: {self.results['total']}")
        print(f"{Colors.GREEN}Passed: {self.results['passed']}{Colors.END}")
        print(f"{Colors.RED}Failed: {self.results['failed']}{Colors.END}")
        
        success_rate = (self.results['passed'] / self.results['total']) * 100 if self.results['total'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Failed tests detail
        failed_tests = [r for r in self.results['details'] if not r['success']]
        if failed_tests:
            print(f"\n{Colors.RED}❌ Failed Tests:{Colors.END}")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
        
        return self.results

async def main():
    """Main test runner"""
    async with BackendTester() as tester:
        results = await tester.run_all_tests()
        
        # Return appropriate exit code
        if results['failed'] == 0:
            print(f"\n{Colors.GREEN}✅ All tests passed!{Colors.END}")
            sys.exit(0)
        else:
            print(f"\n{Colors.RED}❌ {results['failed']} test(s) failed{Colors.END}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())