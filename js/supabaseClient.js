/**
 * Supabase 客户端配置
 * 用于云端数据存储
 */

// Supabase 配置
const SUPABASE_URL = 'https://pwxrijygugjxhpcjveef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eHJpanlndWdqeGhwY2p2ZWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTk2NTQsImV4cCI6MjA5MDg3NTY1NH0.fqzq0WFzHhoOPw4wcuQ1zyC0sSP26T1au4hrqFL_IZ8';

// 简单的 Supabase REST API 客户端（不依赖外部库）
const supabaseClient = {
    /**
     * 执行 GET 请求
     */
    async get(table) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[Supabase] GET ${table} error:`, error);
            return [];
        }
    },

    /**
     * 执行 POST 请求（插入）
     */
    async post(table, data) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error(`[Supabase] POST ${table} error:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 执行 PUT 请求（更新）
     */
    async put(table, data, matchField, matchValue) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchField}=eq.${encodeURIComponent(matchValue)}`, {
                method: 'PUT',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error(`[Supabase] PUT ${table} error:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 执行 PATCH 请求（部分更新）
     */
    async patch(table, data, matchField, matchValue) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchField}=eq.${encodeURIComponent(matchValue)}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            return { success: true, data: result };
        } catch (error) {
            console.error(`[Supabase] PATCH ${table} error:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 执行 DELETE 请求
     */
    async delete(table, matchField, matchValue) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${matchField}=eq.${encodeURIComponent(matchValue)}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true };
        } catch (error) {
            console.error(`[Supabase] DELETE ${table} error:`, error);
            return { success: false, error: error.message };
        }
    }
};

console.log('[Supabase] Client initialized');
