# CMSC-447-Project

Setup Process:
- open a terminal, run the command: ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
- for the "your_email@example.com", use the email linked to your github account
- Navigate to C:/Users/yourUser/.ssh and open the "id_rsa" Microsoft Publisher file in Notepad
- If you do not see .ssh, try enabling the File Explorer to see hidden files (View --> Show --> Hidden Items)
- Copy the full string that you see in Notepad
- Go to your Github Profile Settings --> SSH and GPG Keys --> New SSH key
- Give the key a title if you want, then paste the full string into the "Key" box. Keep "Key type" as "Authentication Key".
- Add SSH key 
- Create a directory to store the project in
- In the new directory, perform "git init"
- Perform "git clone https://github.com/N-Rubiano/CMSC-447-Project.git"
- You should now be able to pull/push code
