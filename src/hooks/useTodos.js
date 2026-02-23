import { useState, useCallback } from 'react';
import * as service from '../services/todos';

export function useTodos() {
  const [todos, setTodos] = useState([]);

  const loadTodos = useCallback(async (email) => {
    const data = await service.fetchPersonalTodos(email);
    setTodos(data);
  }, []);

  const addTodo = useCallback(async (newTodo, userEmail) => {
    const saved = await service.savePersonalTodo(newTodo, userEmail);
    if (saved) {
      setTodos(prev => [saved, ...prev]);
    }
    return saved;
  }, []);

  const toggleTodo = useCallback(async (todoId) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const updated = await service.updatePersonalTodo(todoId, { completed: !todo.completed });
    if (updated) {
      setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
    }
  }, [todos]);

  const updateTodo = useCallback(async (todoId, updates) => {
    const updated = await service.updatePersonalTodo(todoId, updates);
    if (updated) {
      setTodos(prev => prev.map(t => t.id === todoId ? updated : t));
    }
  }, []);

  const deleteTodo = useCallback(async (todoId) => {
    const success = await service.deletePersonalTodo(todoId);
    if (success) {
      setTodos(prev => prev.filter(t => t.id !== todoId));
    }
  }, []);

  return { todos, loadTodos, addTodo, toggleTodo, updateTodo, deleteTodo };
}
