import urllib.request
import json
import subprocess
import os

def cleanup():
    print("Cleaning up any loose extracted application files from previous attempts...")
    kept_files = {
        'App.js', 'README.md', 'app.json', 'assets', 'babel.config.js',
        'copy-assets.js', 'package-lock.json', 'package.json', 'src',
        'install-expo-go.py', 'response.json', '.expo', 'node_modules',
        'expo-go.tar.gz', 'ExpoGo.app'
    }
    for item in os.listdir('.'):
        if item not in kept_files and not item.startswith('.'):
            print(f"Removing junk item: {item}")
            if os.path.isdir(item):
                subprocess.run(['rm', '-rf', item])
            else:
                os.remove(item)

def main():
    # Run cleanup first to clear previous failed run clutter
    cleanup()
    
    try:
        # 1. Fetch Expo SDK versions with a custom User-Agent to bypass Cloudflare
        print("Fetching latest Expo SDK version info...")
        req = urllib.request.Request(
            'https://api.expo.dev/v2/versions/latest', 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())

        # Debug: Save response to examine it
        with open('response.json', 'w') as f_debug:
            json.dump(data, f_debug, indent=2)
            
        # 2. Extract the iOS Simulator URL for SDK 54.0.0
        payload = data.get('data', {})
        sdk_versions = payload.get('sdkVersions', {})
        sdk_info = sdk_versions.get('54.0.0', {})
        url = sdk_info.get('iosClientUrl')
        if not url:
            fuzzy_keys = [k for k in sdk_versions.keys() if k.startswith('54.')]
            if fuzzy_keys:
                print(f"Fuzzy matching SDK version: found {fuzzy_keys[0]}")
                sdk_info = sdk_versions.get(fuzzy_keys[0], {})
                url = sdk_info.get('iosClientUrl')
            if not url:
                raise Exception(f"Could not find iosClientUrl for SDK 54.0.0. Available versions are: {list(sdk_versions.keys())}. Root keys are: {list(data.keys())}")

        print(f"Downloading Expo Go Simulator build from: {url}")
        
        # 3. Download the tarball using the custom User-Agent
        req_dl = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_dl) as r, open('expo-go.tar.gz', 'wb') as f:
            f.write(r.read())

        # 4. Extract the archive into a newly created ExpoGo.app directory
        print("Extracting archive into ExpoGo.app...")
        os.makedirs('ExpoGo.app', exist_ok=True)
        subprocess.run(['tar', '-zxf', 'expo-go.tar.gz', '-C', 'ExpoGo.app'], check=True)

        # 5. Install the app on the booted iOS Simulator
        print("Installing Expo Go on the booted Simulator...")
        subprocess.run(['xcrun', 'simctl', 'install', 'booted', 'ExpoGo.app'], check=True)

        print("Expo Go successfully installed!")

    except Exception as e:
        print(f"Error during installation: {e}")
    finally:
        # 6. Clean up temporary files
        print("Cleaning up temporary files...")
        if os.path.exists('expo-go.tar.gz'):
            os.remove('expo-go.tar.gz')
        if os.path.exists('ExpoGo.app'):
            subprocess.run(['rm', '-rf', 'ExpoGo.app'])

if __name__ == '__main__':
    main()
