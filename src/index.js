import './styles.css';

class Todo {
    constructor(title, description, dueDate, priority, completed = false, tags = [], id = Date.now()) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.priority = priority;
        this.completed = completed;
        this.tags = tags;
        this.createdAt = new Date();
        this.editedAt = null;
    }

    toggleComplete() {
        this.completed = !this.completed;
    }

    edit(updates) {
        Object.assign(this, updates);
        this.editedAt = new Date();
    }

    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
    }

    isOverdue() {
        return new Date(this.dueDate) < new Date() && !this.completed;
    }
}

class Project {
    constructor(name, id = Date.now()) {
        this.id = id;
        this.name = name;
        this.todos = [];
        this.createdAt = new Date();
    }

    addTodo(todo) {
        this.todos.push(todo);
    }

    removeTodo(todoId) {
        this.todos = this.todos.filter(todo => todo.id !== todoId);
    }

    getTodos() {
        return this.todos;
    }

    getTodoById(todoId) {
        return this.todos.find(todo => todo.id === todoId);
    }

    // Search todos by title or description
    searchTodos(query) {
        query = query.toLowerCase();
        return this.todos.filter(todo => 
            todo.title.toLowerCase().includes(query) ||
            todo.description.toLowerCase().includes(query)
        );
    }

    // Filter todos by various criteria
    filterTodos({ status, priority, tags }) {
        return this.todos.filter(todo => {
            const statusMatch = !status || 
                (status === 'completed' && todo.completed) ||
                (status === 'active' && !todo.completed) ||
                (status === 'overdue' && todo.isOverdue());
            
            const priorityMatch = !priority || todo.priority === priority;
            
            const tagsMatch = !tags || tags.length === 0 ||
                tags.some(tag => todo.tags.includes(tag));

            return statusMatch && priorityMatch && tagsMatch;
        });
    }

    // Sort todos by different criteria
    sortTodos(criteria = 'dueDate', ascending = true) {
        const sortFunctions = {
            dueDate: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
            priority: (a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            },
            title: (a, b) => a.title.localeCompare(b.title),
            createdAt: (a, b) => a.createdAt - b.createdAt
        };

        const sortFn = sortFunctions[criteria] || sortFunctions.dueDate;
        return [...this.todos].sort((a, b) => ascending ? sortFn(a, b) : -sortFn(a, b));
    }
}

class ProjectManager {
    constructor() {
        this.projects = [new Project('Default')];
    }

    addProject(project) {
        this.projects.push(project);
    }

    removeProject(projectId) {
        if (projectId === this.projects[0].id) return; // Prevent removing default project
        this.projects = this.projects.filter(project => project.id !== projectId);
    }

    getProjects() {
        return this.projects;
    }

    getProjectById(projectId) {
        return this.projects.find(project => project.id === projectId);
    }
}

class App {
    constructor() {
        this.projectManager = Storage.loadData() || new ProjectManager();
        this.currentProject = this.projectManager.getProjects()[0];
        this.currentFilter = { status: null, priority: null, tags: [] };
        this.currentSort = { criteria: 'dueDate', ascending: true };
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.initializeProjects();
        this.initializeTodos();
        this.initializeFilters();
        this.initializeSearch();
        this.render();
    }

    initializeProjects() {
        const addProjectBtn = document.getElementById('addProjectBtn');
        const newProjectInput = document.getElementById('newProjectInput');

        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', () => {
                const projectName = newProjectInput.value.trim();
                if (projectName) {
                    const project = new Project(projectName);
                    this.projectManager.addProject(project);
                    newProjectInput.value = '';
                    this.render();
                    Storage.saveData(this.projectManager);
                }
            });
        }

        const projectList = document.getElementById('projectList');
        if (projectList) {
            projectList.addEventListener('click', (e) => {
                const projectDiv = e.target.closest('.project');
                if (projectDiv) {
                    const projectId = Number(projectDiv.dataset.projectId);
                    this.currentProject = this.projectManager.getProjectById(projectId);
                    this.render();
                }

                if (e.target.classList.contains('delete')) {
                    const projectId = Number(projectDiv.dataset.projectId);
                    this.projectManager.removeProject(projectId);
                    if (this.currentProject.id === projectId) {
                        this.currentProject = this.projectManager.getProjects()[0];
                    }
                    this.render();
                    Storage.saveData(this.projectManager);
                }
            });
        }
    }

    initializeTodos() {
        const todoForm = document.getElementById('todoForm');
        if (todoForm) {
            todoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const title = document.getElementById('todoTitle').value;
                const description = document.getElementById('todoDescription').value;
                const dueDate = document.getElementById('todoDueDate').value;
                const priority = document.getElementById('todoPriority').value;
                const tags = document.getElementById('todoTags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag);

                const todo = new Todo(title, description, dueDate, priority, false, tags);
                this.currentProject.addTodo(todo);
                
                todoForm.reset();
                this.render();
                Storage.saveData(this.projectManager);
            });
        }

        const todoList = document.getElementById('todoList');
        if (todoList) {
            todoList.addEventListener('click', (e) => {
                const todoDiv = e.target.closest('.todo');
                if (!todoDiv) return;

                const todoId = Number(todoDiv.dataset.todoId);
                const todo = this.currentProject.getTodoById(todoId);

                if (e.target.type === 'checkbox') {
                    todo.toggleComplete();
                } else if (e.target.classList.contains('delete')) {
                    this.currentProject.removeTodo(todoId);
                } else if (e.target.classList.contains('edit')) {
                    this.showEditModal(todo);
                }

                this.render();
                Storage.saveData(this.projectManager);
            });
        }
    }

    initializeFilters() {
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('change', (e) => {
                this.currentFilter = {
                    status: document.getElementById('filterStatus').value || null,
                    priority: document.getElementById('filterPriority').value || null,
                    tags: document.getElementById('filterTags').value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag)
                };
                this.render();
            });
        }

        const sortSelect = document.getElementById('sortCriteria');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentSort.criteria = sortSelect.value;
                this.render();
            });
        }

        const sortDirection = document.getElementById('sortDirection');
        if (sortDirection) {
            sortDirection.addEventListener('click', () => {
                this.currentSort.ascending = !this.currentSort.ascending;
                sortDirection.textContent = this.currentSort.ascending ? '↑' : '↓';
                this.render();
            });
        }
    }

    initializeSearch() {
        const searchInput = document.getElementById('searchTodos');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.render();
            });
        }
    }

    showEditModal(todo) {
        // Create and show modal for editing todo
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Edit Todo</h3>
                <form id="editTodoForm">
                    <input type="text" id="editTitle" value="${todo.title}" required>
                    <textarea id="editDescription">${todo.description}</textarea>
                    <input type="date" id="editDueDate" value="${todo.dueDate}" required>
                    <select id="editPriority">
                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <input type="text" id="editTags" value="${todo.tags.join(', ')}">
                    <div class="modal-buttons">
                        <button type="submit">Save</button>
                        <button type="button" id="cancelEdit">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const editForm = document.getElementById('editTodoForm');
        const cancelBtn = document.getElementById('cancelEdit');

        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            todo.edit({
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value,
                dueDate: document.getElementById('editDueDate').value,
                priority: document.getElementById('editPriority').value,
                tags: document.getElementById('editTags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
            });
            modal.remove();
            this.render();
            Storage.saveData(this.projectManager);
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    render() {
        this.renderProjects();
        this.renderTodos();
    }

    renderProjects() {
        const projectList = document.getElementById('projectList');
        if (!projectList) return;

        projectList.innerHTML = '';
        
        this.projectManager.getProjects().forEach((project) => {
            const projectDiv = document.createElement('div');
            projectDiv.className = 'project';
            if (project === this.currentProject) {
                projectDiv.classList.add('active');
            }
            projectDiv.dataset.projectId = project.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${project.name} (${project.todos.length})`;
            projectDiv.appendChild(nameSpan);
            
            if (project !== this.projectManager.getProjects()[0]) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete';
                projectDiv.appendChild(deleteBtn);
            }
            
            projectList.appendChild(projectDiv);
        });
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        if (!todoList) return;

        todoList.innerHTML = '';

        let todos = this.currentProject.getTodos();

        // Apply search
        if (this.searchQuery) {
            todos = this.currentProject.searchTodos(this.searchQuery);
        }

        // Apply filters
        todos = this.currentProject.filterTodos(this.currentFilter);

        // Apply sorting
        todos = this.currentProject.sortTodos(this.currentSort.criteria, this.currentSort.ascending);
        
        todos.forEach((todo) => {
            const todoDiv = document.createElement('div');
            todoDiv.className = `todo ${todo.priority}`;
            if (todo.completed) todoDiv.classList.add('completed');
            if (todo.isOverdue()) todoDiv.classList.add('overdue');
            todoDiv.dataset.todoId = todo.id;
            
            todoDiv.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="title">${todo.title}</span>
                <span class="description">${todo.description}</span>
                <span class="due-date">${todo.dueDate}</span>
                <div class="tags">${todo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
                <button class="edit">Edit</button>
                <button class="delete">Delete</button>
            `;
            
            todoList.appendChild(todoDiv);
        });
    }
}

const Storage = {
    saveData(projectManager) {
        localStorage.setItem('todoApp', JSON.stringify(projectManager));
    },

    loadData() {
        const data = localStorage.getItem('todoApp');
        if (data) {
            const parsed = JSON.parse(data);
            const pm = new ProjectManager();
            pm.projects = parsed.projects.map(project => {
                const newProject = new Project(project.name, project.id);
                newProject.todos = project.todos.map(todo => 
                    new Todo(
                        todo.title,
                        todo.description,
                        todo.dueDate,
                        todo.priority,
                        todo.completed,
                        todo.tags,
                        todo.id
                    )
                );
                return newProject;
            });
            return pm;
        }
        return null;
    }
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});