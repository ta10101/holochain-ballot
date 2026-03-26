{
  description = "Holochain ballot hApp — voting DNA, Docker/Nix dev shell, Tryorama tests.";

  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.6";
    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem = { inputs', pkgs, ... }: {
        formatter = pkgs.nixpkgs-fmt;

        devShells.default = pkgs.mkShell {
          packages = (with inputs'.holonix.packages; [
            holochain
            hc
            hcterm
            bootstrap-srv
            lair-keystore
            hc-scaffold
            hn-introspect
            rust
          ])
          ++ (with pkgs; [
            nodejs_24
            binaryen
          ]);

          shellHook = ''
            export PS1='\[\033[1;34m\][holochain-ballot:\w]\$\[\033[0m\] '
          '';
        };
      };
    };
}
