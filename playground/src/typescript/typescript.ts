import './typescript.pcss';

// Define an interface for a User
interface User {
  id: number;
  name: string;
  email: string;
}

// Type alias for a function that takes a number and returns a string
type Formatter = (value: number) => string;

// Function using the type alias
const formatCurrency: Formatter = amount => {
  return `$${amount.toFixed(2)}`;
};

// A class to represent a Task
class Task {
  private completed: boolean;

  constructor(
    public title: string,
    public description: string
  ) {
    this.completed = false;
  }

  markAsCompleted(): void {
    this.completed = true;
  }

  getStatus(): string {
    return this.completed ? 'Completed' : 'Pending';
  }
}

// Creating an object that implements the User interface
const user: User = {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com',
};

// Creating a Task instance and marking it as completed
const task = new Task('Learn TypeScript', 'Study the basics of TypeScript');
task.markAsCompleted();

// Log the user and task details
console.log(`${user.name} has the email ${user.email}`);
console.log(`Task: ${task.title} - Status: ${task.getStatus()}`);
console.log(`Formatted amount: ${formatCurrency(123.45)}`);
