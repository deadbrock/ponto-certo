# 🤖 Configuração Android - MaterialIcons

## Arquivo: `android/app/build.gradle`

Adicione no final do arquivo:

```gradle
// ... código existente ...

apply from: file("../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle"); applyNativeModulesAppBuildGradle(project)

// ADICIONAR ESTA LINHA:
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

## Arquivo: `android/app/src/main/java/com/apptotemclean/MainApplication.java`

```java
package com.apptotemclean;

import android.app.Application;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

// ADICIONAR ESTE IMPORT:
import com.oblador.vectoricons.VectorIconsPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
          // ADICIONAR ESTA LINHA:
          new VectorIconsPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
```

## Teste da Configuração

Após as alterações:

```bash
cd android
./gradlew clean
cd ..
npm run android
```

Se aparecer erro de ícones, execute:
```bash
npx react-native link react-native-vector-icons
``` 