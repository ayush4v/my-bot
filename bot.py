import requests
import json
import os
import sys

def print_welcome():
    print("=" * 50)
    print("[BOT] ProChat AI Assistant (Console)")
    print("=" * 50)
    print("Type 'exit' or 'quit' to stop.")
    print("Type 'clear' to clear the screen.\n")

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_ai_response(chat_history):
    url = "https://text.pollinations.ai/"
    
    payload = {
        "messages": chat_history,
        "model": "openai"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        return f"Error: Khshma karein, internet connection mein problem hai. ({e})"

def main():
    clear_screen()
    print_welcome()
    
    # System prompt to give personality to the bot
    chat_history = [
        {"role": "system", "content": "You are a highly advanced, professional, and friendly AI Assistant. You answer directly in the console. You speak both Hinglish and English properly depending on how the user talks."}
    ]
    
    while True:
        try:
            # User Input
            user_input = input("\n[Aap]: ").strip()
            
            # Commands handling
            if user_input.lower() in ['exit', 'quit']:
                print("\n[Bot]: Alvida! Phir milenge! (Goodbye)")
                sys.exit(0)
            elif user_input.lower() == 'clear':
                clear_screen()
                print_welcome()
                continue
            elif not user_input:
                continue
                
            # Add user message to history
            chat_history.append({"role": "user", "content": user_input})
            
            print("\n[Bot] soch raha hai...\n")
            
            # Get response from API
            bot_response = get_ai_response(chat_history)
            
            # Add bot response to history
            chat_history.append({"role": "assistant", "content": bot_response})
            
            # Print response
            print(f"[Bot]: {bot_response}")

        except KeyboardInterrupt:
            print("\n[Bot]: Alvida! (Goodbye)")
            sys.exit(0)
        except Exception as e:
            print(f"\n[Error]: {e}")

if __name__ == "__main__":
    main()
