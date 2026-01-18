export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));


export const getInitials = (name: string) => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}; 
