<?php
class JWTHelper
{
    private static function cle(): string
    {
        return $_ENV['JWT_SECRET'] ?? throw new RuntimeException('JWT_SECRET manquant');
    }

    public static function generer(array $payload): string
    {
        $header  = self::b64(['alg' => 'HS256', 'typ' => 'JWT']);
        $payload['exp'] = time() + JWT_EXPIRATION;
        $body    = self::b64($payload);
        $sig     = hash_hmac('sha256', "$header.$body", self::cle(), true);
        return "$header.$body." . rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
    }

    public static function verifier(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) throw new RuntimeException('Token malformé', 401);

        [$header, $body, $sig] = $parts;
        $sigAttendue = rtrim(strtr(base64_encode(
            hash_hmac('sha256', "$header.$body", self::cle(), true)
        ), '+/', '-_'), '=');

        if (!hash_equals($sigAttendue, $sig)) {
            throw new RuntimeException('Signature JWT invalide', 401);
        }

        $payload = json_decode(self::b64decode($body), true);
        if ($payload['exp'] < time()) {
            throw new RuntimeException('Token expiré', 401);
        }

        return $payload;
    }

    private static function b64(array $data): string
    {
        return rtrim(strtr(base64_encode(json_encode($data)), '+/', '-_'), '=');
    }

    private static function b64decode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}